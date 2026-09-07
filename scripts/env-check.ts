import { loadEnvConfig } from "@next/env";
import { assertEnvironmentSafety, getRuntimeDiagnostics } from "@/lib/runtime/environment";

loadEnvConfig(process.cwd());

assertEnvironmentSafety();
const diagnostics = getRuntimeDiagnostics();
console.log(`RAPID Environment: ${diagnostics.environment}`);
console.log(`Supabase Project: ${diagnostics.supabaseProjectRef}`);
console.log(`Git SHA: ${diagnostics.gitSha}`);
console.log(`Deployment Environment: ${diagnostics.deploymentEnvironment}`);
