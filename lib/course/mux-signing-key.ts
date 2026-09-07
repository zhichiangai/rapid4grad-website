import { importPKCS8 } from "jose";

const PKCS8_PEM_HEADER = "-----BEGIN PRIVATE KEY-----";
const PKCS8_PEM_FOOTER = "-----END PRIVATE KEY-----";

function normalizePem(value: string) {
  return value.trim().replace(/\\n/g, "\n");
}

function isBase64(value: string) {
  const compact = value.replace(/\s/g, "");
  return compact.length > 0 && compact.length % 4 !== 1 && /^[A-Za-z0-9+/_-]*={0,2}$/.test(compact);
}

function derToPem(bytes: Buffer) {
  const encoded = bytes.toString("base64").match(/.{1,64}/g)?.join("\n") ?? "";
  return `${PKCS8_PEM_HEADER}\n${encoded}\n${PKCS8_PEM_FOOTER}`;
}

function canonicalizePem(pem: string) {
  const body = pem
    .slice(PKCS8_PEM_HEADER.length, -PKCS8_PEM_FOOTER.length)
    .replace(/\s/g, "");
  if (!isBase64(body)) throw new Error("MUX signing key PEM body is not valid Base64");
  return derToPem(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
}

export function decodeMuxSigningPrivateKey(value: string) {
  const candidate = normalizePem(value);
  if (candidate.startsWith(PKCS8_PEM_HEADER)) {
    if (!candidate.endsWith(PKCS8_PEM_FOOTER)) throw new Error("MUX signing key has an invalid PEM footer");
    return canonicalizePem(candidate);
  }
  if (!isBase64(candidate)) throw new Error("MUX signing key is not a supported encoding");

  const bytes = Buffer.from(candidate.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const decodedText = bytes.toString("utf8");
  const decodedPem = decodedText.includes(PKCS8_PEM_HEADER) ? canonicalizePem(normalizePem(decodedText)) : derToPem(bytes);

  if (!decodedPem.startsWith(PKCS8_PEM_HEADER) || !decodedPem.endsWith(PKCS8_PEM_FOOTER)) {
    throw new Error("MUX signing key must be a PKCS8 PEM or Base64-encoded PKCS8 PEM");
  }

  return decodedPem;
}

export function importMuxSigningPrivateKey(value: string) {
  const candidate = normalizePem(value);
  let decodedPem: string;
  try {
    decodedPem = decodeMuxSigningPrivateKey(candidate);
  } catch (error) {
    console.error("[mux-signing-key] PKCS8 input rejected", {
      inputFormat: candidate.startsWith(PKCS8_PEM_HEADER) ? "raw-pem" : isBase64(candidate) ? "base64-or-der" : "unknown",
      decodedLength: 0,
      header: false,
      footer: false,
      importPKCS8: "NOT_ATTEMPTED",
    });
    throw error;
  }
  const diagnostics = {
    inputFormat: candidate.startsWith(PKCS8_PEM_HEADER) ? "raw-pem" : "base64-or-der",
    decodedLength: decodedPem.length,
    header: decodedPem.startsWith(PKCS8_PEM_HEADER),
    footer: decodedPem.endsWith(PKCS8_PEM_FOOTER),
    pemBodyLength: decodedPem.slice(PKCS8_PEM_HEADER.length, -PKCS8_PEM_FOOTER.length).replace(/\s/g, "").length,
  };

  return importPKCS8(decodedPem, "RS256").catch((error) => {
    console.error("[mux-signing-key] PKCS8 import failed", { ...diagnostics, importPKCS8: "FAIL" });
    throw error;
  });
}
