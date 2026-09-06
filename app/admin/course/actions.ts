"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/authorization";
import { isValidMuxPlaybackId } from "@/lib/course/mux";
import { createMuxClient } from "@/lib/course/mux-server";

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

function automaticSlug(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return slug || `lesson-${crypto.randomUUID().slice(0, 8)}`;
}

async function nextSortOrder(admin: Awaited<ReturnType<typeof requireAdminContext>>["admin"]) {
  const { data } = await admin.from("course_lessons").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  return ((data?.sort_order ?? 0) + 10);
}

function isMuxNotFound(error: unknown) {
  const candidate = error as { status?: number; statusCode?: number; message?: string } | null;
  return candidate?.status === 404 || candidate?.statusCode === 404 || candidate?.message?.includes("404");
}

async function deleteTrustedMuxAsset(assetId: string | null) {
  if (!assetId) return { deleted: false, associationOnly: true };
  try {
    await createMuxClient().video.assets.delete(assetId);
    return { deleted: true, associationOnly: false };
  } catch (error) {
    if (isMuxNotFound(error)) return { deleted: false, associationOnly: false };
    throw error;
  }
}

export async function createDraftCourseLesson(formData: FormData) {
  const { admin } = await requireAdminContext("/admin/course");
  const courseId = value(formData, "courseId", 80);
  const title = value(formData, "title");
  const moduleKey = value(formData, "moduleKey", 40) || "Research";
  const accessLevel = value(formData, "accessLevel", 30) || "public_preview";
  const description = value(formData, "description", 4000);
  const materialUrl = value(formData, "materialUrl", 2048);
  if (!courseId || !title || !MODULE_KEYS.includes(moduleKey as (typeof MODULE_KEYS)[number]) || !ACCESS_LEVELS.includes(accessLevel as (typeof ACCESS_LEVELS)[number]) || !validMaterialUrl(materialUrl)) {
    return { success: false as const, error: "請先輸入課程標題並確認基本資料。" };
  }
  const { data: course } = await admin.from("courses").select("id").eq("id", courseId).maybeSingle();
  if (!course) return { success: false as const, error: "找不到指定課程。" };
  let slug = automaticSlug(title);
  const { data: collision } = await admin.from("course_lessons").select("id").eq("slug", slug).maybeSingle();
  if (collision) slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await admin.from("course_lessons").insert({
    course_id: courseId,
    title,
    slug,
    module_key: moduleKey,
    description: description || null,
    access_level: accessLevel as (typeof ACCESS_LEVELS)[number],
    video_provider: "mux",
    video_external_id: null,
    video_status: "empty",
    material_url: materialUrl || null,
    sort_order: await nextSortOrder(admin),
    is_published: false,
  }).select("id").single();
  if (error || !data) {
    console.error("[admin-course] Draft creation failed", { code: error?.code });
    return { success: false as const, error: "目前無法建立課程草稿。" };
  }
  revalidatePath("/admin/course");
  return { success: true as const, lessonId: data.id };
}

export async function saveCourseLesson(formData: FormData) {
  const { admin } = await requireAdminContext("/admin/course");
  const courseId = value(formData, "courseId", 80);
  const lesson = parseLesson(formData);
  const current = lesson.lessonId
    ? (await admin.from("course_lessons").select("id,course_id,video_provider,video_external_id,video_upload_id,video_asset_id,video_status").eq("id", lesson.lessonId).eq("course_id", courseId).maybeSingle()).data
    : null;
  const validProvider = VIDEO_PROVIDERS.includes(lesson.videoProvider as (typeof VIDEO_PROVIDERS)[number]);
  const playbackId = lesson.videoProvider === "mux" ? (current?.video_provider === "mux" ? current.video_external_id ?? "" : "") : lesson.videoSource;
  const muxReady = lesson.videoProvider === "mux" && current?.video_status === "ready" && Boolean(playbackId);
  const validVideo = lesson.videoProvider === "mux" ? (!lesson.isPublished || (muxReady && isValidMuxPlaybackId(playbackId))) : validUrl(playbackId, !lesson.isPublished);
  const valid = lesson.title.length > 0 && lesson.slug.length > 0 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug) && MODULE_KEYS.includes(lesson.moduleKey as (typeof MODULE_KEYS)[number]) && ACCESS_LEVELS.includes(lesson.accessLevel as (typeof ACCESS_LEVELS)[number]) && validProvider && validVideo && validMaterialUrl(lesson.materialUrl) && Number.isSafeInteger(lesson.sortOrder) && lesson.sortOrder >= 0;
  if (!courseId || (lesson.lessonId && !current) || !valid) redirect("/admin/course?message=invalid");

  const payload = { course_id: courseId, title: lesson.title, slug: lesson.slug, module_key: lesson.moduleKey, description: lesson.description || null, access_level: lesson.accessLevel as (typeof ACCESS_LEVELS)[number], video_provider: lesson.videoProvider, video_external_id: playbackId || null, video_status: lesson.videoProvider === "html5" ? (playbackId ? "ready" : "empty") : current?.video_status ?? "empty", material_url: lesson.materialUrl || null, sort_order: lesson.sortOrder, is_published: lesson.isPublished };
  const result = lesson.lessonId
    ? await admin.from("course_lessons").update(payload).eq("id", lesson.lessonId).eq("course_id", courseId)
    : await admin.from("course_lessons").insert(payload).select("id").single();
  if (result.error) {
    console.error("[admin-course] Lesson mutation failed", { operation: lesson.lessonId ? "update" : "insert", code: result.error.code });
    redirect("/admin/course?message=save-failed");
  }
  revalidatePath("/admin/course");
  revalidatePath("/learn");
  const savedLessonId = lesson.lessonId || (result.data as { id?: string } | null)?.id;
  redirect(savedLessonId ? `/admin/course?edit=${savedLessonId}&message=saved` : "/admin/course?message=saved");
}

export async function unpublishCourseLesson(formData: FormData) {
  const { admin } = await requireAdminContext("/admin/course");
  const lessonId = value(formData, "lessonId", 80);
  const { data: lesson } = await admin.from("course_lessons").select("id,is_published").eq("id", lessonId).maybeSingle();
  if (!lesson || !lesson.is_published) redirect(`/admin/course?edit=${lessonId}&message=invalid`);
  const { error } = await admin.from("course_lessons").update({ is_published: false }).eq("id", lessonId);
  if (error) redirect(`/admin/course?edit=${lessonId}&message=save-failed`);
  revalidatePath("/admin/course");
  revalidatePath("/learn");
  redirect(`/admin/course?edit=${lessonId}&message=unpublished`);
}

export async function removeCourseLessonVideo(formData: FormData) {
  const { admin } = await requireAdminContext("/admin/course");
  const lessonId = value(formData, "lessonId", 80);
  const { data: lesson } = await admin.from("course_lessons").select("id,is_published,video_asset_id,video_upload_id,video_external_id").eq("id", lessonId).maybeSingle();
  if (!lesson) redirect("/admin/course?message=invalid");
  if (lesson.is_published && formData.get("confirmPublishedRemove") !== "on") redirect(`/admin/course?edit=${lessonId}&message=remove-confirmation`);
  try {
    const result = await deleteTrustedMuxAsset(lesson.video_asset_id);
    const { error } = await admin.from("course_lessons").update({ is_published: false, video_external_id: null, video_asset_id: null, video_upload_id: null, video_status: "empty" }).eq("id", lessonId);
    if (error) redirect(`/admin/course?edit=${lessonId}&message=remove-failed`);
    revalidatePath("/admin/course");
    revalidatePath("/learn");
    redirect(`/admin/course?edit=${lessonId}&message=${result.associationOnly ? "removed-association" : "removed"}`);
  } catch (error) {
    console.error("[admin-course] Video removal failed", { code: isMuxNotFound(error) ? "not-found" : "mux-error" });
    redirect(`/admin/course?edit=${lessonId}&message=remove-failed`);
  }
}

export async function deleteDraftCourseLesson(formData: FormData) {
  const { admin } = await requireAdminContext("/admin/course");
  const lessonId = value(formData, "lessonId", 80);
  const { data: lesson } = await admin.from("course_lessons").select("id,is_published,video_asset_id,video_upload_id,video_status").eq("id", lessonId).maybeSingle();
  if (!lesson || lesson.is_published || formData.get("confirmDelete") !== "on") redirect(`/admin/course?edit=${lessonId}&message=delete-blocked`);
  const { count, error: progressError } = await admin.from("course_progress").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
  if (progressError || (count ?? 0) > 0) redirect(`/admin/course?edit=${lessonId}&message=delete-has-history`);
  if (lesson.video_upload_id && !lesson.video_asset_id && lesson.video_status !== "empty") redirect(`/admin/course?edit=${lessonId}&message=delete-processing`);
  try {
    await deleteTrustedMuxAsset(lesson.video_asset_id);
    const { error } = await admin.from("course_lessons").delete().eq("id", lessonId).eq("is_published", false);
    if (error) redirect(`/admin/course?edit=${lessonId}&message=delete-failed`);
    revalidatePath("/admin/course");
    revalidatePath("/learn");
    redirect("/admin/course?message=deleted");
  } catch (error) {
    console.error("[admin-course] Draft deletion failed", { code: isMuxNotFound(error) ? "not-found" : "mux-error" });
    redirect(`/admin/course?edit=${lessonId}&message=delete-failed`);
  }
}
