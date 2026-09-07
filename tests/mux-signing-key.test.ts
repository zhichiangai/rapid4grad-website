import assert from "node:assert/strict";
import { generateKeyPair, exportPKCS8 } from "jose";
import { generateKeyPairSync } from "node:crypto";
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

test("Mux signing key accepts escaped raw PKCS8 PEM", async () => {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  const pem = await exportPKCS8(privateKey);

  await assert.doesNotReject(() => importMuxSigningPrivateKey(pem.replace(/\n/g, "\\n")));
});

test("Mux signing key accepts Base64 PKCS8 DER", async () => {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  const pem = await exportPKCS8(privateKey);
  const der = Buffer.from(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""), "base64");

  await assert.doesNotReject(() => importMuxSigningPrivateKey(der.toString("base64")));
});

test("Mux signing key accepts Base64 PKCS1 PEM", async () => {
  const { privateKey: pem } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { format: "pem", type: "pkcs1" },
    publicKeyEncoding: { format: "pem", type: "spki" },
  });
  const encoded = Buffer.from(pem, "utf8").toString("base64");

  await assert.doesNotReject(() => importMuxSigningPrivateKey(encoded));
});

test("Mux signing key accepts raw PKCS1 PEM", async () => {
  const { privateKey: pem } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { format: "pem", type: "pkcs1" },
    publicKeyEncoding: { format: "pem", type: "spki" },
  });

  await assert.doesNotReject(() => importMuxSigningPrivateKey(pem));
});

test("malformed Mux signing key fails without exposing input", () => {
  const malformed = "not-a-private-key";

  assert.throws(
    () => importMuxSigningPrivateKey(malformed),
    (error: unknown) => error instanceof Error && /supported encoding|PKCS8 PEM/.test(error.message) && !error.message.includes(malformed),
  );
});
