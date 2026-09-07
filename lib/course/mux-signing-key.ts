import { importPKCS8 } from "jose";
import { createPrivateKey } from "node:crypto";

const PKCS8_PEM_HEADER = "-----BEGIN PRIVATE KEY-----";
const PKCS8_PEM_FOOTER = "-----END PRIVATE KEY-----";
const PKCS1_PEM_HEADER = "-----BEGIN RSA PRIVATE KEY-----";
const PKCS1_PEM_FOOTER = "-----END RSA PRIVATE KEY-----";

function normalizePem(value: string) {
  return value.trim().replace(/\\n/g, "\n");
}

function isBase64(value: string) {
  const compact = value.replace(/\s/g, "");
  return compact.length > 0 && compact.length % 4 !== 1 && /^[A-Za-z0-9+/_-]*={0,2}$/.test(compact);
}

function derToPem(bytes: Buffer, header = PKCS8_PEM_HEADER, footer = PKCS8_PEM_FOOTER) {
  const encoded = bytes.toString("base64").match(/.{1,64}/g)?.join("\n") ?? "";
  return `${header}\n${encoded}\n${footer}`;
}

function canonicalizePem(pem: string, header: string, footer: string) {
  const body = pem
    .slice(header.length, -footer.length)
    .replace(/\s/g, "");
  if (!isBase64(body)) throw new Error("MUX signing key PEM body is not valid Base64");
  return derToPem(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64"), header, footer);
}

function convertPkcs1ToPkcs8(pem: string) {
  return createPrivateKey({ key: pem, format: "pem", type: "pkcs1" })
    .export({ format: "pem", type: "pkcs8" })
    .toString();
}

export function decodeMuxSigningPrivateKey(value: string) {
  const candidate = normalizePem(value);
  const pemFormat = candidate.startsWith(PKCS1_PEM_HEADER)
    ? { header: PKCS1_PEM_HEADER, footer: PKCS1_PEM_FOOTER }
    : candidate.startsWith(PKCS8_PEM_HEADER)
      ? { header: PKCS8_PEM_HEADER, footer: PKCS8_PEM_FOOTER }
      : null;
  if (pemFormat) {
    if (!candidate.endsWith(pemFormat.footer)) throw new Error("MUX signing key has an invalid PEM footer");
    return canonicalizePem(candidate, pemFormat.header, pemFormat.footer);
  }
  if (!isBase64(candidate)) throw new Error("MUX signing key is not a supported encoding");

  const bytes = Buffer.from(candidate.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const decodedText = bytes.toString("utf8");
  const decodedFormat = decodedText.includes(PKCS1_PEM_HEADER)
    ? { header: PKCS1_PEM_HEADER, footer: PKCS1_PEM_FOOTER }
    : decodedText.includes(PKCS8_PEM_HEADER)
      ? { header: PKCS8_PEM_HEADER, footer: PKCS8_PEM_FOOTER }
      : null;
  const decodedPem = decodedFormat
    ? canonicalizePem(normalizePem(decodedText), decodedFormat.header, decodedFormat.footer)
    : derToPem(bytes);

  if (
    (![PKCS8_PEM_HEADER, PKCS1_PEM_HEADER].some((header) => decodedPem.startsWith(header))) ||
    (![PKCS8_PEM_FOOTER, PKCS1_PEM_FOOTER].some((footer) => decodedPem.endsWith(footer)))
  ) {
    throw new Error("MUX signing key must be a PKCS1/PKCS8 PEM or Base64-encoded PEM");
  }

  return decodedPem;
}

export function importMuxSigningPrivateKey(value: string) {
  const candidate = normalizePem(value);
  let decodedPem: string;
  try {
    decodedPem = decodeMuxSigningPrivateKey(candidate);
  } catch (error) {
    console.error("[mux-signing-key] signing key input rejected", {
      inputFormat: candidate.startsWith(PKCS1_PEM_HEADER) || candidate.startsWith(PKCS8_PEM_HEADER) ? "raw-pem" : isBase64(candidate) ? "base64-or-der" : "unknown",
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

  const importPromise = importPKCS8(
    decodedPem.startsWith(PKCS1_PEM_HEADER) ? convertPkcs1ToPkcs8(decodedPem) : decodedPem,
    "RS256",
  );

  return importPromise.catch((error) => {
    console.error("[mux-signing-key] signing key import failed", {
      ...diagnostics,
      keyFormat: decodedPem.startsWith(PKCS1_PEM_HEADER) ? "PKCS1" : "PKCS8",
      importKey: "FAIL",
    });
    throw error;
  });
}
