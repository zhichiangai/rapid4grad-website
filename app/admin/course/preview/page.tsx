import { CourseLearningExperience, type CourseLessonView } from "@/components/course/CourseLearningExperience";
import { requireAdminContext } from "@/lib/admin/authorization";
import Link from "next/link";

export default async function AdminCoursePreviewPage({ searchParams }: { searchParams: Promise<{ lessonId?: string }> }) {
  const params = await searchParams;
  const { admin } = await requireAdminContext("/admin/course/preview");
  const { data: lesson } = params.lessonId ? await admin.from("course_lessons").select("id,course_id,slug,module_key,title,description,access_level,material_url,sort_order,video_provider,video_external_id,video_status").eq("id", params.lessonId).maybeSingle() : { data: null };
  if (!lesson) return <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-8"><h1 className="text-2xl font-semibold">找不到課程單元</h1><Link href="/admin/course" className="mt-5 inline-flex text-cyan-200">返回課程管理</Link></section>;
  const { data: course } = await admin.from("courses").select("title,description").eq("id", lesson.course_id).maybeSingle();
  const previewLesson: CourseLessonView = { id: lesson.id, slug: lesson.slug, moduleKey: lesson.module_key, title: lesson.title, description: lesson.description, accessLevel: lesson.access_level, materialUrl: lesson.material_url, sortOrder: lesson.sort_order, progress: null };
  const canPlay = lesson.video_provider === "mux" ? lesson.video_status === "ready" && Boolean(lesson.video_external_id) : Boolean(lesson.video_external_id);
  return <><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">Course Studio Preview</p><h1 className="mt-2 text-2xl font-semibold">預覽學習頁</h1></div><Link href={`/admin/course?edit=${lesson.id}`} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200">返回編輯</Link></div><CourseLearningExperience course={{ title: course?.title ?? "RAPID4GRAD 課程", description: course?.description ?? null }} lessons={[previewLesson]} isAuthenticated={false} previewMode={!canPlay} playbackEndpoint="/api/admin/course/lessons" /></>;
}
