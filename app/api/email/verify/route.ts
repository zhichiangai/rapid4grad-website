import { randomInt, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  createVerifiedSessionToken,
  EMAIL_CHALLENGE_COOKIE,
  EMAIL_VERIFIED_SESSION_COOKIE,
  EMAIL_VERIFIED_SESSION_TTL_SECONDS,
  keyedHash,
} from "@/lib/email-verification/session";
import { createAdminClient } from "@/lib/supabase/server";

type VerifyEmailPayload = { action?: unknown; email?: unknown; pin?: unknown };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_PATTERN = /^\d{6}$/;
const BODY_LIMIT_BYTES = 4096;
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_EMAIL_SENDS = 3;
const MAX_IP_SENDS = 8;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function requestIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

async function parsePayload(request: NextRequest): Promise<VerifyEmailPayload | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > BODY_LIMIT_BYTES) return null;
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) return null;
  try {
    return JSON.parse(raw) as VerifyEmailPayload;
  } catch {
    return null;
  }
}

function buildEmailHtml(pin: string) {
  return `<div style="margin:0;padding:32px;background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><div style="max-width:640px;margin:0 auto;border:1px solid rgba(148,163,184,.18);border-radius:28px;background:#0f172a;padding:32px"><p style="color:#93c5fd;font-weight:700;letter-spacing:.24em">RAPID4GRAD</p><h1 style="color:#fff">AI 指令產生器免費額度驗證碼</h1><p>請在 10 分鐘內輸入以下驗證碼：</p><p style="font-size:42px;font-weight:800;letter-spacing:.22em;color:#fff;text-align:center">${pin}</p><p style="color:#94a3b8">若你沒有要求這封信，可以直接忽略。</p></div></div>`;
}

async function sendChallenge(request: NextRequest, email: string) {
  const supabase = createAdminClient();
  const emailHash = keyedHash("email", email);
  const ipHash = keyedHash("ip", requestIp(request));
  const now = Date.now();
  const windowStart = new Date(now - RATE_WINDOW_MS).toISOString();
  const cooldownStart = new Date(now - SEND_COOLDOWN_MS).toISOString();

  const [{ count: emailCount, error: emailRateError }, { count: ipCount, error: ipRateError }, { count: cooldownCount, error: cooldownError }] =
    await Promise.all([
      supabase.from("email_verification_challenges").select("id", { count: "exact", head: true }).eq("email_hash", emailHash).gte("created_at", windowStart),
      supabase.from("email_verification_challenges").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", windowStart),
      supabase.from("email_verification_challenges").select("id", { count: "exact", head: true }).eq("email_hash", emailHash).gte("created_at", cooldownStart),
    ]);

  if (emailRateError || ipRateError || cooldownError) {
    console.error("[email-verify] Rate limit lookup failed", {
      emailCode: emailRateError?.code,
      ipCode: ipRateError?.code,
      cooldownCode: cooldownError?.code,
    });
    return jsonError("目前無法發送驗證碼，請稍後再試。", 503);
  }

  if ((cooldownCount ?? 0) > 0) return jsonError("請稍候一分鐘再重新發送驗證碼。", 429);
  if ((emailCount ?? 0) >= MAX_EMAIL_SENDS || (ipCount ?? 0) >= MAX_IP_SENDS) {
    return jsonError("驗證碼請求過於頻繁，請稍後再試。", 429);
  }

  const challengeId = randomUUID();
  const pin = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(now + CHALLENGE_TTL_MS).toISOString();
  const { error: insertError } = await supabase.from("email_verification_challenges").insert({
    id: challengeId,
    email_hash: emailHash,
    pin_hash: keyedHash("pin", `${challengeId}:${pin}`),
    ip_hash: ipHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("[email-verify] Challenge insert failed", { code: insertError.code });
    return jsonError("目前無法發送驗證碼，請稍後再試。", 503);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return jsonError("目前無法發送驗證碼，請稍後再試。", 503);
  const { error: resendError } = await new Resend(apiKey).emails.send({
    from: process.env.RESEND_FROM_EMAIL || "RAPID4GRAD <onboarding@resend.dev>",
    to: email,
    subject: "【RAPID4GRAD】你的 AI 指令產生器免費額度驗證碼",
    html: buildEmailHtml(pin),
  });
  if (resendError) {
    console.error("[email-verify] Resend delivery failed");
    await supabase.from("email_verification_challenges").delete().eq("id", challengeId);
    return jsonError("驗證碼寄送失敗，請稍後再試。", 502);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(EMAIL_CHALLENGE_COOKIE, challengeId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CHALLENGE_TTL_MS / 1000,
    path: "/",
  });
  return response;
}

async function verifyChallenge(request: NextRequest, email: string, pin: string) {
  const challengeId = request.cookies.get(EMAIL_CHALLENGE_COOKIE)?.value;
  if (!challengeId || !/^[0-9a-f-]{36}$/i.test(challengeId)) {
    return jsonError("驗證流程已失效，請重新發送驗證碼。", 400);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("verify_email_challenge", {
    target_id: challengeId,
    target_email_hash: keyedHash("email", email),
    target_pin_hash: keyedHash("pin", `${challengeId}:${pin}`),
  });
  if (error) {
    console.error("[email-verify] Challenge verification failed", { code: error.code });
    return jsonError("目前無法完成驗證，請稍後再試。", 503);
  }
  if (data !== "verified") {
    const message = data === "expired" ? "驗證碼已過期，請重新發送。" : data === "locked" ? "驗證錯誤次數過多，請重新發送驗證碼。" : "驗證碼錯誤。";
    return jsonError(message, 400);
  }

  const expiresAt = Date.now() + EMAIL_VERIFIED_SESSION_TTL_SECONDS * 1000;
  const token = createVerifiedSessionToken({ challengeId, email, expiresAt });
  const response = NextResponse.json({ success: true });
  response.cookies.set(EMAIL_VERIFIED_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EMAIL_VERIFIED_SESSION_TTL_SECONDS,
    path: "/",
  });
  response.cookies.delete(EMAIL_CHALLENGE_COOKIE);
  return response;
}

export async function POST(request: NextRequest) {
  const payload = await parsePayload(request);
  if (!payload) return jsonError("無效的請求格式。", 400);
  const email = normalizeEmail(payload.email);
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return jsonError("請輸入有效的 Email。", 400);

  try {
    if (payload.action === "send") return await sendChallenge(request, email);
    if (payload.action === "verify") {
      const pin = typeof payload.pin === "string" ? payload.pin.trim() : "";
      if (!PIN_PATTERN.test(pin)) return jsonError("請輸入 6 位數驗證碼。", 400);
      return await verifyChallenge(request, email, pin);
    }
    return jsonError("無效的驗證動作。", 400);
  } catch (error) {
    console.error("[email-verify] Unexpected failure", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("目前無法完成驗證，請稍後再試。", 500);
  }
}
