import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const EMAIL_CHALLENGE_COOKIE = "rapid_email_challenge";
export const EMAIL_VERIFIED_SESSION_COOKIE = "rapid_email_verified_session";
export const EMAIL_VERIFIED_SESSION_TTL_SECONDS = 10 * 60;

type SessionPayload = {
  challengeId: string;
  email: string;
  expiresAt: number;
};

function signingSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Email verification signing secret is unavailable.");
  return secret;
}

export function keyedHash(purpose: string, value: string) {
  return createHmac("sha256", signingSecret())
    .update(`${purpose}:${value}`, "utf8")
    .digest("hex");
}

function safeEqualHex(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createVerifiedSessionToken(payload: SessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = keyedHash("verified-session", encoded);
  return `${encoded}.${signature}`;
}

export function parseVerifiedSessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = keyedHash("verified-session", encoded);
  if (!safeEqualHex(expected, signature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    if (
      typeof payload.challengeId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function verifyEmailSession(
  supabase: SupabaseClient,
  token: string | undefined,
) {
  if (!token) return null;
  const payload = parseVerifiedSessionToken(token);
  if (!payload) return null;

  const { data, error } = await supabase
    .from("email_verification_challenges")
    .select("id,email_hash,verified_at,expires_at")
    .eq("id", payload.challengeId)
    .maybeSingle<{
      id: string;
      email_hash: string;
      verified_at: string | null;
      expires_at: string;
    }>();

  if (error) {
    console.error("[email-session] Challenge lookup failed", { code: error.code });
    return null;
  }

  if (
    !data?.verified_at ||
    new Date(data.expires_at).getTime() <= Date.now() ||
    data.email_hash !== keyedHash("email", payload.email)
  ) {
    return null;
  }

  return { email: payload.email, challengeId: payload.challengeId };
}
