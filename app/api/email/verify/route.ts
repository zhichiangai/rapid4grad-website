import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type VerifyEmailPayload = {
  action?: unknown;
  email?: unknown;
  token?: unknown;
  pin?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_PATTERN = /^\d{6}$/;
const TOKEN_TTL_MS = 10 * 60 * 1000;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getSigningSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!secret) {
    throw new Error("SUPABASE_SECRET_KEY is not configured.");
  }

  return secret;
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(apiKey);
}

function signVerificationState({
  email,
  pin,
  expiresAt,
}: {
  email: string;
  pin: string;
  expiresAt: number;
}) {
  return createHmac("sha256", getSigningSecret())
    .update(`${email}.${pin}.${expiresAt}`, "utf8")
    .digest("hex");
}

function buildToken({
  email,
  pin,
  expiresAt,
}: {
  email: string;
  pin: string;
  expiresAt: number;
}) {
  const signature = signVerificationState({ email, pin, expiresAt });
  return `${expiresAt}.${signature}`;
}

function isSignatureValid({
  expected,
  received,
}: {
  expected: string;
  received: string;
}) {
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function generatePin() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function buildEmailHtml(pin: string) {
  return `
    <div style="margin:0;padding:32px;background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(148,163,184,0.18);border-radius:28px;background:linear-gradient(180deg,#0f172a,#020617);padding:32px;box-shadow:0 24px 80px rgba(30,64,175,0.24);">
        <p style="margin:0;color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;">RAPID4GRAD</p>
        <h1 style="margin:18px 0 0;color:#ffffff;font-size:28px;line-height:1.35;">AI 指令產生器免費額度驗證碼</h1>
        <p style="margin:16px 0 0;color:#cbd5e1;font-size:15px;line-height:1.8;">
          你正在驗證 RAPID4GRAD 研究報告 AI 指令產生器的免費使用額度。請在 10 分鐘內回到頁面輸入以下 6 位數驗證碼。
        </p>
        <div style="margin:28px 0;padding:24px;border-radius:24px;background:rgba(37,99,235,0.16);border:1px solid rgba(147,197,253,0.26);text-align:center;">
          <p style="margin:0;color:#bfdbfe;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;">Verification Code</p>
          <p style="margin:12px 0 0;color:#ffffff;font-size:42px;line-height:1;font-weight:800;letter-spacing:0.22em;font-family:'SFMono-Regular',Consolas,monospace;">${pin}</p>
        </div>
        <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.8;">
          若你沒有要求這封信，可以直接忽略。此驗證碼只用於 RAPID4GRAD Phase 1 免費額度解鎖，不會要求你回覆密碼或付款資訊。
        </p>
      </div>
    </div>
  `;
}

async function handleSend(email: string) {
  const pin = generatePin();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const token = buildToken({ email, pin, expiresAt });
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "RAPID4GRAD <onboarding@resend.dev>",
    to: email,
    subject: "【RAPID4GRAD】你的 AI 指令產生器免費額度驗證碼",
    html: buildEmailHtml(pin),
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to send verification email." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, token });
}

function handleVerify({
  email,
  token,
  pin,
}: {
  email: string;
  token: string;
  pin: string;
}) {
  const [expiresAtRaw, receivedSignature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAtRaw || !receivedSignature || !Number.isFinite(expiresAt)) {
    return jsonError("Invalid verification token.");
  }

  if (Date.now() > expiresAt) {
    return jsonError("Verification code has expired.");
  }

  const expectedSignature = signVerificationState({ email, pin, expiresAt });

  if (
    !isSignatureValid({
      expected: expectedSignature,
      received: receivedSignature,
    })
  ) {
    return jsonError("Invalid verification code.");
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  let payload: VerifyEmailPayload;

  try {
    payload = (await request.json()) as VerifyEmailPayload;
  } catch {
    return jsonError("Invalid JSON payload.");
  }

  const action = payload.action;
  const email = normalizeEmail(payload.email);

  if (action !== "send" && action !== "verify") {
    return jsonError("Invalid action.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    return jsonError("Invalid email format.");
  }

  try {
    if (action === "send") {
      return await handleSend(email);
    }

    const token = typeof payload.token === "string" ? payload.token : "";
    const pin = typeof payload.pin === "string" ? payload.pin.trim() : "";

    if (!token || !PIN_PATTERN.test(pin)) {
      return jsonError("Token and 6-digit PIN are required.");
    }

    return handleVerify({ email, token, pin });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email verification failed.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
