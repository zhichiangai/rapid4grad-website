import { CourseLearningExperience } from "@/components/course/CourseLearningExperience";
import { createV2Client } from "@/lib/supabase/server";

function safeMaterialUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function LearnPage() {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,title,description")
    .eq("slug", "rapid4grad-core")
    .eq("is_published", true)
    .maybeSingle();

  if (courseError) {
    console.error("Course catalog query failed", { code: courseError.code });
  }

  const { data: lessonRows, error: lessonError } = course
    ? await supabase
        .from("course_lessons")
        .select(
          "id,slug,module_key,title,description,access_level,material_url,sort_order",
        )
        .eq("course_id", course.id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (lessonError) {
    console.error("Course lesson catalog query failed", {
      code: lessonError.code,
    });
  }

  const lessonIds = lessonRows?.map((lesson) => lesson.id) ?? [];
  const { data: progressRows } =
    user && lessonIds.length > 0
      ? await supabase
          .from("course_progress")
          .select("lesson_id,status,progress_seconds")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds)
      : { data: [] };

  const progressByLesson = new Map(
    progressRows?.map((progress) => [progress.lesson_id, progress]) ?? [],
  );
  const lessons =
    lessonRows?.map((lesson) => {
      const progress = progressByLesson.get(lesson.id);
      return {
        id: lesson.id,
        slug: lesson.slug,
        moduleKey: lesson.module_key,
        title: lesson.title,
        description: lesson.description,
        accessLevel: lesson.access_level,
        materialUrl: safeMaterialUrl(lesson.material_url),
        sortOrder: lesson.sort_order,
        progress: progress
          ? {
              status: progress.status,
              progressSeconds: progress.progress_seconds,
            }
          : null,
      };
    }) ?? [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.2),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <CourseLearningExperience
          course={{
            title: course?.title ?? "RAPID4GRAD 課程中心",
            description: course?.description ?? null,
          }}
          lessons={lessons}
          isAuthenticated={Boolean(user)}
        />
      </div>
    </main>
  );
}
