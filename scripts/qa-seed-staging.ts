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

const { data: existingLesson, error: lessonLookupError } = await admin
  .from("course_lessons")
  .select("id,slug,title,video_status,video_asset_id,video_external_id")
  .eq("course_id", course.id)
  .eq("slug", "staging-course-qa-10s")
  .maybeSingle();
if (lessonLookupError) throw lessonLookupError;

if (existingLesson) {
  console.log(`Staging QA lesson already exists: ${existingLesson.slug} (${existingLesson.id})`);
  console.log(`Video status preserved: ${existingLesson.video_status}`);
} else {
  const { data: lesson, error: lessonError } = await admin
    .from("course_lessons")
    .insert({
      course_id: course.id,
      slug: "staging-course-qa-10s",
      module_key: "Research",
      title: "[STAGING] Course Video 10s",
      description: "Persistent staging-only lesson for non-production course QA.",
      sort_order: 10,
      access_level: "public_preview",
      video_provider: "mux",
      video_status: "empty",
      publication_state: "draft",
      is_published: false,
    })
    .select("id,slug,title")
    .single();
  if (lessonError) throw lessonError;
  console.log(`Staging QA lesson created: ${lesson.slug} (${lesson.id})`);
}

console.log("No Production project was touched.");
