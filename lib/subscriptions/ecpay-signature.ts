import { createHash, timingSafeEqual } from "node:crypto";

function phpUrlEncode(value: string) {
  const bytes = Buffer.from(value, "utf8");
  let encoded = "";

  for (const byte of bytes) {
    const character = String.fromCharCode(byte);
    if (/[A-Za-z0-9_.-]/.test(character)) {
      encoded += character;
    } else if (byte === 0x20) {
      encoded += "+";
    } else {
      encoded += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    }
  }

  return encoded;
}

export function createEcpayCheckMacValue(
  fields: Record<string, string>,
  hashKey: string,
  hashIv: string,
) {
  const query = Object.entries(fields)
    .filter(([key]) => key !== "CheckMacValue")
    .sort(([left], [right]) =>
      left.toLowerCase().localeCompare(right.toLowerCase(), "en"),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const source = `HashKey=${hashKey}&${query}&HashIV=${hashIv}`;
  const encoded = phpUrlEncode(source)
    .toLowerCase()
    .replaceAll("%2d", "-")
    .replaceAll("%5f", "_")
    .replaceAll("%2e", ".")
    .replaceAll("%21", "!")
    .replaceAll("%2a", "*")
    .replaceAll("%28", "(")
    .replaceAll("%29", ")");

  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export function verifyEcpayCheckMacValue(
  fields: Record<string, string>,
  hashKey: string,
  hashIv: string,
) {
  const provided = fields.CheckMacValue?.toUpperCase();
  if (!provided) return false;

  const expected = createEcpayCheckMacValue(fields, hashKey, hashIv);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}
