import "server-only";

import Mux from "@mux/mux-node";

function required(name: "MUX_TOKEN_ID" | "MUX_TOKEN_SECRET" | "MUX_WEBHOOK_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function createMuxClient() {
  return new Mux({
    tokenId: required("MUX_TOKEN_ID"),
    tokenSecret: required("MUX_TOKEN_SECRET"),
    webhookSecret: required("MUX_WEBHOOK_SECRET"),
  });
}
