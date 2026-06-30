import "server-only";

import { createHash, randomBytes } from "crypto";

const INVITE_CODE_BYTES = 9;

function getHashPepper() {
  const pepper = process.env.SUPABASE_SECRET_KEY;

  if (!pepper) {
    throw new Error("SUPABASE_SECRET_KEY is not configured.");
  }

  return pepper;
}

export function normalizeInviteCode(code: string) {
  return code.trim().replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

export function generateInviteCode() {
  const raw = randomBytes(INVITE_CODE_BYTES).toString("base64url").toUpperCase();
  const normalized = normalizeInviteCode(raw).slice(0, 12);
  return normalized.match(/.{1,4}/g)?.join("-") ?? normalized;
}

export function hashInviteCode(code: string) {
  return createHash("sha256")
    .update(`${normalizeInviteCode(code)}:${getHashPepper()}`, "utf8")
    .digest("hex");
}
