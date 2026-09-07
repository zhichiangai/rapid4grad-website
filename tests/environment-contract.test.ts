import assert from "node:assert/strict";
import test from "node:test";

test("environment guard maps only approved cloud projects", async () => {
  const environmentModule = await import("../lib/runtime/environment");
  assert.equal(environmentModule.getSupabaseProjectRef("https://jpvvcniktyjcdpkfopna.supabase.co"), "jpvvcniktyjcdpkfopna");
  assert.equal(environmentModule.getSupabaseProjectRef("https://ktfvscyxsdrcrbaemlbl.supabase.co"), "ktfvscyxsdrcrbaemlbl");
  assert.equal(environmentModule.getSupabaseProjectRef("https://qrfbshncmakvcfjraxiu.supabase.co"), "qrfbshncmakvcfjraxiu");
});
