export type RapidEnvironment = "local" | "staging" | "production";

const EXPECTED_SUPABASE_REFS: Record<Exclude<RapidEnvironment, "local">, string> = {
  staging: "jpvvcniktyjcdpkfopna",
  production: "ktfvscyxsdrcrbaemlbl",
};

function normalizeEnvironment(value: string | undefined): RapidEnvironment {
  return value === "staging" || value === "production" ? value : "local";
}

export function getSupabaseProjectRef(url = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith(".supabase.co") ? hostname.slice(0, -".supabase.co".length) : null;
  } catch {
    return null;
  }
}

export function getRuntimeEnvironment(): RapidEnvironment {
  return normalizeEnvironment(process.env.RAPID_ENV);
}

export function assertEnvironmentSafety() {
  // Next may statically render pages during build before deployment variables exist.
  // Runtime requests still execute this guard before any Supabase client is created.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const environment = getRuntimeEnvironment();
  const projectRef = getSupabaseProjectRef();
  const expectedRef = environment === "local" ? null : EXPECTED_SUPABASE_REFS[environment];
  if (!projectRef) throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL.");
  if (expectedRef && projectRef !== expectedRef) {
    throw new Error(`Environment mismatch: RAPID_ENV=${environment} requires Supabase project ${expectedRef}, received ${projectRef}.`);
  }
  if (projectRef === "qrfbshncmakvcfjraxiu") {
    throw new Error("The inactive legacy Supabase project is not allowed.");
  }
}

export function getRuntimeDiagnostics() {
  return {
    environment: getRuntimeEnvironment(),
    supabaseProjectRef: getSupabaseProjectRef(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? process.env.GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
    deploymentEnvironment: process.env.VERCEL_ENV ?? "local",
  };
}
