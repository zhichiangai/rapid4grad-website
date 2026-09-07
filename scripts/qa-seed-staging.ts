import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const expectedRef = "jpvvcniktyjcdpkfopna";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ref = new URL(url).hostname.split(".")[0];

if (process.env.RAPID_ENV !== "staging" || ref !== expectedRef) {
  throw new Error(`Refusing staging seed: RAPID_ENV=${process.env.RAPID_ENV ?? "unset"}, project=${ref || "invalid"}.`);
}

const secret = process.env.SUPABASE_SECRET_KEY;
if (!secret) throw new Error("SUPABASE_SECRET_KEY is required locally for the staging seed and is never printed.");

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: course, error } = await admin
  .from("courses")
  .upsert({ slug: "staging-course-qa", title: "[STAGING] RAPID Course QA", description: "Persistent staging-only QA fixture." }, { onConflict: "slug" })
  .select("id,slug,title")
  .single();
if (error) throw error;
console.log(`Staging QA course ready: ${course.slug} (${course.id})`);
console.log("No Production project was touched.");
