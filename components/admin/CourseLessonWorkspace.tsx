"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDraftCourseLesson, saveCourseLesson } from "@/app/admin/course/actions";
import MuxVideoUploader from "./MuxVideoUploader";

type Course = { id: string; title: string };
type Lesson = { id: string; course_id: string; title: string; slug: string; module_key: string; description: string | null; access_level: "public_preview" | "lab_basic" | "full_course"; video_provider: string; video_external_id: string | null; video_status: string; material_url: string | null; sort_order: number; is_published: boolean };
const modules = { Research: "Research｜研究", Application: "Application｜應用", Presentation: "Presentation｜表達", Interpersonal: "Interpersonal｜互動", Direction: "Direction｜方向" };
const accesses = { public_preview: "公開試看", lab_basic: "Lab 課程", full_course: "完整課程" };

export default function CourseLessonWorkspace({ courses, lesson, defaultSortOrder }: { courses: Course[]; lesson: Lesson | null; defaultSortOrder: number }) {
  const router = useRouter();
  const [lessonId, setLessonId] = useState(lesson?.id ?? "");
  const [courseId, setCourseId] = useState(lesson?.course_id ?? courses[0]?.id ?? "");
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [moduleKey, setModuleKey] = useState(lesson?.module_key ?? "Research");
  const [accessLevel, setAccessLevel] = useState(lesson?.access_level ?? "public_preview");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [materialUrl, setMaterialUrl] = useState(lesson?.material_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(Boolean(lesson?.id));
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const ensureDraft = async (file?: File) => {
    if (lessonId) return lessonId;
    const data = new FormData(); data.set("courseId", courseId); data.set("title", title); data.set("moduleKey", moduleKey); data.set("accessLevel", accessLevel); data.set("description", description); data.set("materialUrl", materialUrl);
    const result = await createDraftCourseLesson(data);
    if (!result.success) { setError(result.error); return null; }
    setPendingFile(file ?? null); setLessonId(result.lessonId); setDraftReady(true); return result.lessonId;
  };
  return <form action={saveCourseLesson} className="h-fit rounded-2xl border border-white/10 bg-slate-950/80 p-5">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">{lesson ? "Edit Lesson" : "New Lesson"}</p><h2 className="mt-2 text-xl font-semibold">{lesson ? "編輯課程單元" : "新增課程單元"}</h2></div>{lesson ? <Link href="/admin/course" className="text-xs text-slate-400">清除編輯</Link> : null}</div>
    <input type="hidden" name="lessonId" value={lessonId} /><input type="hidden" name="slug" value={lesson?.slug ?? ""} /><input type="hidden" name="sortOrder" value={lesson?.sort_order ?? defaultSortOrder} /><input type="hidden" name="videoProvider" value="mux" /><input type="hidden" name="muxPlaybackId" value={lesson?.video_external_id ?? ""} />
    <label className="mt-5 block text-sm text-slate-300">課程<select name="courseId" value={courseId} onChange={(event) => setCourseId(event.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white">{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
    <label className="mt-4 block text-sm text-slate-300">標題<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={500} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white" /></label>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-300">Module<select name="moduleKey" value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white">{Object.entries(modules).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="block text-sm text-slate-300">權限<select name="accessLevel" value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as keyof typeof accesses)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white">{Object.entries(accesses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    <label className="mt-4 block text-sm text-slate-300">描述<textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white" /></label>
    {draftReady && lessonId ? <MuxVideoUploader lessonId={lessonId} currentStatus={lesson?.video_status ?? "empty"} currentPlaybackId={lesson?.video_external_id ?? null} initialFile={pendingFile} onComplete={() => { router.replace(`/admin/course?edit=${lessonId}`); router.refresh(); }} /> : <section className="mt-4 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-400/[0.04] p-5"><p className="text-sm font-semibold text-white">影片</p><p className="mt-2 text-xs leading-5 text-slate-400">輸入標題後直接選擇影片；系統會自動建立草稿並開始上傳。</p><input id="new-course-video" type="file" accept="video/mp4,video/webm,.mp4,.webm" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void ensureDraft(file); }} /><label htmlFor="new-course-video" className={`mt-4 inline-flex cursor-pointer rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 ${!title.trim() || !courseId ? "pointer-events-none opacity-40" : ""}`}>選擇影片</label></section>}
    {error ? <p className="mt-3 text-sm text-red-200" role="alert">{error}</p> : null}
    <details className="mt-4 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm text-slate-300">進階設定</summary><label className="mt-3 block text-sm text-slate-300">教材 URL（選填）<input name="materialUrl" value={materialUrl} onChange={(event) => setMaterialUrl(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white" /></label><p className="mt-3 text-xs text-slate-500">Mux、Playback ID、Slug 與排序由系統管理；HTML5 備援僅供既有維護流程使用。</p></details>
    <div className="mt-5 flex flex-wrap gap-3"><button disabled={!lessonId || !courses.length} className="rounded-xl border border-cyan-300/20 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">儲存草稿</button>{lessonId && lesson?.video_status === "ready" && !lesson.is_published ? <button type="submit" formAction={saveCourseLesson} name="isPublished" value="on" className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950">發布課程</button> : null}{lessonId && lesson?.video_status === "ready" ? <Link href={`/admin/course/preview?lessonId=${lessonId}`} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950">預覽</Link> : null}</div>
  </form>;
}
