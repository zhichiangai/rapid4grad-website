import "server-only";

import { SignJWT } from "jose";
import { importMuxSigningPrivateKey } from "@/lib/course/mux-signing-key";

const MUX_TOKEN_TTL_SECONDS = 3 * 60 * 60;
const MAX_PLAYBACK_ID_LENGTH = 256;

function readRequiredEnv(name: "MUX_SIGNING_KEY_ID" | "MUX_SIGNING_PRIVATE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function isValidMuxPlaybackId(value: string) {
  return value.length > 0 && value.length <= MAX_PLAYBACK_ID_LENGTH && !/[\u0000-\u001f\u007f\s]/.test(value);
}

export async function signMuxPlaybackToken(playbackId: string) {
  if (!isValidMuxPlaybackId(playbackId)) throw new Error("Invalid Mux playback ID");

  const keyId = readRequiredEnv("MUX_SIGNING_KEY_ID");
  const signingKey = await importMuxSigningPrivateKey(readRequiredEnv("MUX_SIGNING_PRIVATE_KEY"));
  const expiration = Math.floor(Date.now() / 1000) + MUX_TOKEN_TTL_SECONDS;

  return new SignJWT({ aud: "v", kid: keyId })
    .setProtectedHeader({ alg: "RS256", kid: keyId, typ: "JWT" })
    .setSubject(playbackId)
    .setExpirationTime(expiration)
    .sign(signingKey);
}
