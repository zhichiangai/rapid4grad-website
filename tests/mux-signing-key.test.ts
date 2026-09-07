import assert from "node:assert/strict";
import { generateKeyPair, exportPKCS8 } from "jose";
import { test } from "node:test";
import { importMuxSigningPrivateKey } from "../lib/course/mux-signing-key";

test("Mux signing key accepts Base64 PKCS8 PEM", async () => {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  const pem = await exportPKCS8(privateKey);
  const encoded = Buffer.from(pem, "utf8").toString("base64");

  await assert.doesNotReject(() => importMuxSigningPrivateKey(encoded));
});

test("Mux signing key accepts raw PKCS8 PEM", async () => {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  const pem = await exportPKCS8(privateKey);

  await assert.doesNotReject(() => importMuxSigningPrivateKey(pem));
});

test("malformed Mux signing key fails without exposing input", () => {
  const malformed = "not-a-private-key";

  assert.throws(
    () => importMuxSigningPrivateKey(malformed),
    (error: unknown) => error instanceof Error && error.message.includes("PKCS8 PEM") && !error.message.includes(malformed),
  );
});
