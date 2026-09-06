"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/authorization";
import { isValidMuxPlaybackId } from "@/lib/course/mux";

const MODULE_KEYS = ["Research", "Application", "Presentation", "Interpersonal", "Direction"] as const;
const ACCESS_LEVELS = ["public_preview", "lab_basic", "full_course"] as const;
const VIDEO_PROVIDERS = ["mux", "html5"] as const;

function value(formData: FormData, key: string, max = 500) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

function parseLesson(formData: FormData) {
  const title = value(formData, "title");
  const slug = value(formData, "slug", 120).toLowerCase();
  const moduleKey = value(formData, "moduleKey", 40);
  const accessLevel = value(formData, "accessLevel", 30);
  const videoProvider = value(formData, "videoProvider", 20) || "mux";
  const muxPlaybackId = value(formData, "muxPlaybackId", 256);
  const videoSource = value(formData, "videoSource", 2048);
  const materialUrl = value(formData, "materialUrl", 2048);
  const description = value(formData, "description", 4000);
  const sortOrderRaw = value(formData, "sortOrder", 12);
  const sortOrder = /^\d+$/.test(sortOrderRaw) ? Number(sortOrderRaw) : NaN;
  const isPublished = formData.get("isPublished") === "on";
  const lessonId = value(formData, "lessonId", 80);
  return { title, slug, moduleKey, accessLevel, videoProvider, muxPlaybackId, videoSource, materialUrl, description, sortOrder, isPublished, lessonId };
}

function validUrl(valueToCheck: string, allowEmpty = true) {
  if (!valueToCheck && allowEmpty) return true;
  try {
    const url = new URL(valueToCheck);
    const pathname = url.pathname.toLowerCase();
    return url.protocol === "https:" && (pathname.endsWith(".mp4") || pathname.endsWith(".webm"));
  } catch {
    return false;
  }
}

function validMaterialUrl(valueToCheck: string) {
  if (!valueToCheck) return true;
  if (valueToCheck.startsWith("/") && !valueToCheck.startsWith("//")) return true;
  try {
    return new URL(valueToCheck).protocol === "https:";
  } catch {
    return false;
  }
}

export async function saveCourseLesson(formData: FormData) {
  const { admin } = await requireAdminContext("/admin/course");
  const courseId = value(formData, "courseId", 80);
  const lesson = parseLesson(formData);
  const current = lesson.lessonId
    ? (await admin.from("course_lessons").select("id,course_id,video_provider,video_external_id,video_upload_id,video_asset_id,video_status").eq("id", lesson.lessonId).eq("course_id", courseId).maybeSingle()).data
    : null;
  const validProvider = VIDEO_PROVIDERS.includes(lesson.videoProvider as (typeof VIDEO_PROVIDERS)[number]);
  const playbackId = lesson.videoProvider === "mux" ? lesson.muxPlaybackId || (current?.video_provider === "mux" ? current.video_external_id ?? "" : "") : lesson.videoSource;
  const muxReady = lesson.videoProvider === "mux" && (lesson.muxPlaybackId.length > 0 || current?.video_status === "ready");
  const validVideo = lesson.videoProvider === "mux" ? (!lesson.isPublished || (muxReady && isValidMuxPlaybackId(playbackId))) : validUrl(playbackId, !lesson.isPublished);
  const valid = lesson.title.length > 0 && lesson.slug.length > 0 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug) && MODULE_KEYS.includes(lesson.moduleKey as (typeof MODULE_KEYS)[number]) && ACCESS_LEVELS.includes(lesson.accessLevel as (typeof ACCESS_LEVELS)[number]) && validProvider && validVideo && validMaterialUrl(lesson.materialUrl) && Number.isSafeInteger(lesson.sortOrder) && lesson.sortOrder >= 0;
  if (!courseId || (lesson.lessonId && !current) || !valid) redirect("/admin/course?message=invalid");

  const payload = { course_id: courseId, title: lesson.title, slug: lesson.slug, module_key: lesson.moduleKey, description: lesson.description || null, access_level: lesson.accessLevel as (typeof ACCESS_LEVELS)[number], video_provider: lesson.videoProvider, video_external_id: playbackId || null, video_status: lesson.videoProvider === "html5" ? (playbackId ? "ready" : "empty") : lesson.muxPlaybackId ? "ready" : current?.video_status ?? "empty", material_url: lesson.materialUrl || null, sort_order: lesson.sortOrder, is_published: lesson.isPublished };
  const result = lesson.lessonId
    ? await admin.from("course_lessons").update(payload).eq("id", lesson.lessonId).eq("course_id", courseId)
    : await admin.from("course_lessons").insert(payload);
  if (result.error) {
    console.error("[admin-course] Lesson mutation failed", { operation: lesson.lessonId ? "update" : "insert", code: result.error.code });
    redirect("/admin/course?message=save-failed");
  }
  revalidatePath("/admin/course");
  revalidatePath("/learn");
  redirect("/admin/course?message=saved");
}
