"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";

export type CourseLessonView = {
  id: string;
  slug: string;
  moduleKey: string;
  title: string;
  description: string | null;
  accessLevel: "public_preview" | "lab_basic" | "full_course";
  materialUrl: string | null;
  sortOrder: number;
  progress: { status: "not_started" | "in_progress" | "completed"; progressSeconds: number } | null;
};

type PlaybackResponse = { success?: boolean; error?: string; playback?: { lessonId: string; title: string; src: string; contentType: "video/mp4" | "video/webm" } };

const ACCESS_LABELS: Record<CourseLessonView["accessLevel"], string> = { public_preview: "公開試看", lab_basic: "Lab 課程", full_course: "完整課程" };
const MODULE_LABELS: Record<string, string> = { Research: "Research｜研究", Application: "Application｜應用", Presentation: "Presentation｜表達", Interpersonal: "Interpersonal｜互動", Direction: "Direction｜方向" };
const getModuleLabel = (key: string) => MODULE_LABELS[key] ?? key;

function getInitialLessonId(lessons: CourseLessonView[]) {
  return lessons.find((lesson) => lesson.progress?.status === "in_progress")?.id ?? lessons.find((lesson) => lesson.progress?.status !== "completed")?.id ?? lessons[0]?.id ?? null;
}

function safeResumeSeconds(lesson: CourseLessonView | null) {
  const seconds = lesson?.progress?.progressSeconds ?? 0;
  return Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
}

export function CourseLearningExperience({ course, lessons, isAuthenticated, previewMode = false }: { course: { title: string; description: string | null }; lessons: CourseLessonView[]; isAuthenticated: boolean; previewMode?: boolean }) {
  const [selectedLessonId, setSelectedLessonId] = useState(() => getInitialLessonId(lessons));
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [playback, setPlayback] = useState<NonNullable<PlaybackResponse["playback"]> | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(lessons[0]));
  const lastSyncedSecond = useRef(0);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const selectedIndex = selectedLesson ? lessons.indexOf(selectedLesson) : -1;
  const completedCount = lessons.filter((lesson) => lesson.progress?.status === "completed").length;
  const moduleKeys = useMemo(() => Array.from(new Set(lessons.map((lesson) => lesson.moduleKey))), [lessons]);

  useEffect(() => {
    if (!selectedLessonId || previewMode) {
      setIsLoading(false);
      setPlayback(null);
      setPlaybackError(null);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setPlayback(null);
    setPlaybackError(null);
    lastSyncedSecond.current = 0;
    async function loadPlayback() {
      try {
        const response = await fetch(`/api/course/lessons/${encodeURIComponent(selectedLessonId)}/playback`, { cache: "no-store", signal: controller.signal });
        const payload = (await response.json()) as PlaybackResponse;
        if (!response.ok || !payload.success || !payload.playback) {
          setPlaybackError(payload.error ?? "這個單元目前無法播放，請稍後再試。");
          return;
        }
        setPlayback(payload.playback);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPlaybackError("目前無法載入影片，請稍後再試。");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadPlayback();
    return () => controller.abort();
  }, [previewMode, selectedLessonId]);

  async function persistProgress(status: "in_progress" | "completed", progressSeconds: number) {
    if (previewMode || !isAuthenticated || !selectedLessonId) return;
    try {
      await fetch("/api/course/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: selectedLessonId, status, progressSeconds: Math.max(0, Math.floor(progressSeconds)) }), keepalive: true });
    } catch {
      // Progress persistence is best effort and must not block playback.
    }
  }

  const selectLesson = (id: string) => { setSelectedLessonId(id); setCurriculumOpen(false); };
  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => { const second = Math.floor(event.currentTarget.currentTime); if (second - lastSyncedSecond.current < 30) return; lastSyncedSecond.current = second; void persistProgress("in_progress", second); };
  const handlePause = (event: React.SyntheticEvent<HTMLVideoElement>) => { void persistProgress("in_progress", event.currentTarget.currentTime); };
  const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => { const resume = safeResumeSeconds(selectedLesson); const duration = event.currentTarget.duration; if (resume > 0 && Number.isFinite(duration) && resume < duration) event.currentTarget.currentTime = resume; };

  if (!lessons.length) return <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl shadow-cyan-950/20"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Learning Center</p><h1 className="mt-4 text-3xl font-semibold text-white">目前沒有可觀看的課程單元</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">正式影片尚未發布，或你的帳號目前沒有對應的課程權限。公開試看上架後會直接顯示在這裡。</p><Link href="/course" className="mt-7 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">查看課程方案</Link></section>;

  const lessonList = (compact = false) => <nav aria-label="課程單元" className={compact ? "space-y-4" : "space-y-5"}>{moduleKeys.map((moduleKey) => { const moduleLessons = lessons.filter((lesson) => lesson.moduleKey === moduleKey); const moduleCompleted = moduleLessons.filter((lesson) => lesson.progress?.status === "completed").length; return <section key={moduleKey}><div className="flex items-center justify-between gap-3"><h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{getModuleLabel(moduleKey)}</h2><span className="text-[11px] text-slate-600">{moduleCompleted} / {moduleLessons.length}</span></div><div className="mt-2 space-y-2">{moduleLessons.map((lesson) => { const selected = lesson.id === selectedLessonId; const status = lesson.progress?.status; return <button key={lesson.id} type="button" onClick={() => selectLesson(lesson.id)} aria-current={selected ? "true" : undefined} className={`w-full rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? "border-cyan-300/40 bg-cyan-400/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"}`}><span className="flex items-start gap-2 text-sm font-medium"><span aria-hidden="true" className="w-4 shrink-0 text-cyan-200">{status === "completed" ? "✓" : selected ? "▶" : "○"}</span><span>{lesson.title}</span></span><span className="mt-2 flex items-center justify-between gap-2 pl-6 text-[11px] text-slate-500"><span>{ACCESS_LABELS[lesson.accessLevel]}</span><span>{status === "completed" ? "已完成" : status === "in_progress" ? "觀看中" : "未開始"}</span></span></button>; })}</div></section>; })}</nav>;

  return <section><header className="mb-6 rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-cyan-950/20 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">RAPID 課程學習</p><h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{course.title}</h1>{course.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{course.description}</p> : null}</div><div className="sm:text-right"><p className="text-2xl font-semibold text-white">{completedCount} / {lessons.length} <span className="text-sm font-normal text-slate-400">已完成</span></p><p className="mt-1 text-xs text-slate-500">完成度依目前可觀看單元計算</p>{selectedLesson?.progress?.status === "in_progress" ? <button type="button" onClick={() => videoContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} className="mt-3 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950">繼續上次觀看</button> : null}</div></div></header><details className="mb-6 rounded-2xl border border-white/10 bg-slate-950/80 p-4 lg:hidden" open={curriculumOpen} onToggle={(event) => setCurriculumOpen(event.currentTarget.open)}><summary className="cursor-pointer list-none font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">查看課程目錄 <span className="ml-2 text-xs font-normal text-slate-500">{completedCount} / {lessons.length} 完成</span></summary><div className="mt-5">{lessonList(true)}</div></details><div className="grid gap-6 lg:grid-cols-[21rem_1fr]"><aside className="hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-cyan-950/20 lg:block">{lessonList()}</aside><div ref={videoContainerRef} className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-cyan-950/20 sm:p-6">{previewMode ? <p className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">Admin 預覽模式：這裡只顯示課程內容與權限標籤，不會取得影片來源或寫入觀看進度。</p> : null}<div className="aspect-video overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">{isLoading ? <div className="flex h-full items-center justify-center text-sm text-slate-400">正在確認影片權限...</div> : previewMode ? <div className="flex h-full items-center justify-center px-6 text-center"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Video Player Preview</p><p className="mt-3 text-lg font-semibold text-white">{selectedLesson?.title ?? "請選擇課程單元"}</p><p className="mt-2 text-sm leading-6 text-slate-400">發布後會在此播放 HTTPS MP4 / WebM 影片。</p></div></div> : playback ? <video ref={videoElementRef} key={playback.src} className="h-full w-full bg-black" controls controlsList="nodownload" playsInline preload="metadata" onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onPause={handlePause} onEnded={(event) => void persistProgress("completed", event.currentTarget.duration || 0)}><source src={playback.src} type={playback.contentType} />你的瀏覽器目前不支援此影片格式。</video> : <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-amber-100">{playbackError ?? "請選擇一個課程單元。"}</div>}</div>{selectedLesson ? <div className="mt-6"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">{getModuleLabel(selectedLesson.moduleKey)}</span><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">{ACCESS_LABELS[selectedLesson.accessLevel]}</span></div><h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{selectedLesson.title}</h2>{selectedLesson.description ? <p className="mt-3 text-sm leading-7 text-slate-400">{selectedLesson.description}</p> : null}{selectedLesson.materialUrl && !previewMode ? <a href={selectedLesson.materialUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]">開啟教材</a> : null}</div> : null}<div className="mt-7 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2"><button type="button" disabled={selectedIndex <= 0} onClick={() => selectLesson(lessons[selectedIndex - 1].id)} className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35">← 上一課</button><button type="button" disabled={selectedIndex < 0 || selectedIndex >= lessons.length - 1} onClick={() => selectLesson(lessons[selectedIndex + 1].id)} className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-right text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-35">下一課 →</button></div>{selectedLesson?.progress?.status === "completed" ? <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.07] px-4 py-3 text-sm text-emerald-100">✓ 這堂課已完成</p> : null}<p className="mt-5 text-xs leading-6 text-slate-600">影片進度會在觀看中、暫停或結束時盡力保存；保存失敗不會阻塞影片播放。</p></div></div></section>;
}
