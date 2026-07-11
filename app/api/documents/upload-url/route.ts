import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  buildStudentDocumentObjectPath,
  buildStudentDocumentStoragePath,
  isUploadDocumentType,
  STUDENT_DOCUMENTS_BUCKET,
  validatePdfUpload,
} from "@/lib/documents/validation";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

type UploadUrlRequestBody = {
  filename?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  documentType?: unknown;
};

type ActiveCredit = {
  id: string;
  pdf_audit_limit: number;
  pdf_audit_used: number;
  period_start: string;
  period_end: string;
};

function jsonError(message: string, status = 400, extra?: Record<string, Json>) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

function isActivePeriod(start: string, end: string) {
  const now = Date.now();
  return new Date(start).getTime() <= now && now < new Date(end).getTime();
}

async function assertCanUseAiAudit(userId: string) {
  const admin = createAdminClient();
  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("id,status,current_period_start,current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      status: string;
      current_period_start: string;
      current_period_end: string;
    }>();

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  if (
    !subscription ||
    !isActivePeriod(subscription.current_period_start, subscription.current_period_end)
  ) {
    return {
      allowed: false,
      reason: "需要有效的 Phase 2 AI audit 訂閱才能上傳 PDF。",
    };
  }

  const { data: credit, error: creditError } = await admin
    .from("ai_usage_credits")
    .select("id,pdf_audit_limit,pdf_audit_used,period_start,period_end")
    .eq("user_id", userId)
    .eq("subscription_id", subscription.id)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveCredit>();

  if (creditError) {
    throw new Error(creditError.message);
  }

  if (!credit || !isActivePeriod(credit.period_start, credit.period_end)) {
    return {
      allowed: false,
      reason: "目前沒有可用的 AI audit 額度週期。",
    };
  }

  if (credit.pdf_audit_used >= credit.pdf_audit_limit) {
    return {
      allowed: false,
      reason: "本期 PDF audit 額度已用完。",
    };
  }

  return { allowed: true, reason: "" };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return jsonError(userError.message, 401);
  }

  if (!user) {
    return jsonError("Login is required before uploading documents.", 401);
  }

  let body: UploadUrlRequestBody;

  try {
    body = (await request.json()) as UploadUrlRequestBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (
    typeof body.filename !== "string" ||
    typeof body.mimeType !== "string" ||
    typeof body.sizeBytes !== "number"
  ) {
    return jsonError("filename, mimeType, and sizeBytes are required.", 400);
  }

  if (!isUploadDocumentType(body.documentType)) {
    return jsonError("Unsupported document type.", 400);
  }

  const validation = validatePdfUpload({
    filename: body.filename,
    mimeType: body.mimeType,
    sizeBytes: body.sizeBytes,
  });

  if (!validation.valid) {
    return jsonError("Invalid PDF upload.", 400, {
      details: validation.errors,
    });
  }

  try {
    const permission = await assertCanUseAiAudit(user.id);

    if (!permission.allowed) {
      return jsonError(permission.reason, 403);
    }

    const admin = createAdminClient();
    const documentId = randomUUID();
    const objectPath = buildStudentDocumentObjectPath({
      userId: user.id,
      documentId,
      filename: body.filename,
    });
    const storagePath = buildStudentDocumentStoragePath(objectPath);

    const { data, error } = await admin.storage
      .from(STUDENT_DOCUMENTS_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (error) {
      console.error("Signed upload URL creation failed", { code: error.name });
      return jsonError("Upload could not be prepared.", 500);
    }

    return NextResponse.json({
      success: true,
      bucket: STUDENT_DOCUMENTS_BUCKET,
      documentId,
      objectPath,
      storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
      expiresInSeconds: 7200,
    });
  } catch (error) {
    console.error("Upload URL request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("Upload could not be prepared.", 500);
  }
}
