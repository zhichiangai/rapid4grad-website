import { importPKCS8 } from "jose";

const PKCS8_PEM_HEADER = "-----BEGIN PRIVATE KEY-----";
const PKCS8_PEM_FOOTER = "-----END PRIVATE KEY-----";

export function decodeMuxSigningPrivateKey(value: string) {
  const candidate = value.trim();
  const decodedPem = candidate.startsWith(PKCS8_PEM_HEADER)
    ? candidate
    : Buffer.from(candidate, "base64").toString("utf8").trim();

  if (!decodedPem.startsWith(PKCS8_PEM_HEADER) || !decodedPem.endsWith(PKCS8_PEM_FOOTER)) {
    throw new Error("MUX signing key must be a PKCS8 PEM or Base64-encoded PKCS8 PEM");
  }

  return decodedPem;
}

export function importMuxSigningPrivateKey(value: string) {
  return importPKCS8(decodeMuxSigningPrivateKey(value), "RS256");
}
