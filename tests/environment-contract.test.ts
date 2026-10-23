import assert from "node:assert/strict";
import test from "node:test";

test("environment guard maps only approved cloud projects", async () => {
  const environmentModule = await import("../lib/runtime/environment");
  assert.equal(environmentModule.getSupabaseProjectRef("https://jpvvcniktyjcdpkfopna.supabase.co"), "jpvvcniktyjcdpkfopna");
  assert.equal(environmentModule.getSupabaseProjectRef("https://ktfvscyxsdrcrbaemlbl.supabase.co"), "ktfvscyxsdrcrbaemlbl");
  assert.equal(environmentModule.getSupabaseProjectRef("https://qrfbshncmakvcfjraxiu.supabase.co"), "qrfbshncmakvcfjraxiu");
});

test("explicit production and staging environments reject the wrong project", async () => {
  const environmentModule = await import("../lib/runtime/environment");
  const previous = {
    rapidEnv: process.env.RAPID_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    nextPhase: process.env.NEXT_PHASE,
  };
  try {
    delete process.env.NEXT_PHASE;
    process.env.RAPID_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ktfvscyxsdrcrbaemlbl.supabase.co";
    assert.doesNotThrow(() => environmentModule.assertEnvironmentSafety());
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://jpvvcniktyjcdpkfopna.supabase.co";
    assert.throws(() => environmentModule.assertEnvironmentSafety(), /Environment mismatch/);

    process.env.RAPID_ENV = "staging";
    assert.doesNotThrow(() => environmentModule.assertEnvironmentSafety());
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ktfvscyxsdrcrbaemlbl.supabase.co";
    assert.throws(() => environmentModule.assertEnvironmentSafety(), /Environment mismatch/);
  } finally {
    if (previous.rapidEnv === undefined) delete process.env.RAPID_ENV;
    else process.env.RAPID_ENV = previous.rapidEnv;
    if (previous.supabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous.supabaseUrl;
    if (previous.nextPhase === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = previous.nextPhase;
  }
});

test("legacy project is rejected even in local mode", async () => {
  const environmentModule = await import("../lib/runtime/environment");
  const previous = {
    rapidEnv: process.env.RAPID_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    nextPhase: process.env.NEXT_PHASE,
  };
  try {
    delete process.env.NEXT_PHASE;
    process.env.RAPID_ENV = "local";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://qrfbshncmakvcfjraxiu.supabase.co";
    assert.throws(() => environmentModule.assertEnvironmentSafety(), /legacy Supabase project is not allowed/);
  } finally {
    if (previous.rapidEnv === undefined) delete process.env.RAPID_ENV;
    else process.env.RAPID_ENV = previous.rapidEnv;
    if (previous.supabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous.supabaseUrl;
    if (previous.nextPhase === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = previous.nextPhase;
  }
});
