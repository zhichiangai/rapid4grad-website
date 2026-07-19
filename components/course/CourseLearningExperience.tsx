"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type CourseLessonView = {
  id: string;
  slug: string;
  moduleKey: string;
  title: string;
  description: string | null;
  accessLevel: "public_preview" | "lab_basic" | "full_course";
  materialUrl: string | null;
  sortOrder: number;
  progress: {
    status: "not_started" | "in_progress" | "completed";
    progressSeconds: number;
  } | null;
};

type PlaybackResponse = {
  success?: boolean;
  error?: string;
  playback?: {
    lessonId: string;
    title: string;
    src: string;
    contentType: "video/mp4" | "video/webm";
  };
};

const ACCESS_LABELS: Record<CourseLessonView["accessLevel"], string> = {
  public_preview: "公開試看",
  lab_basic: "Lab 團隊",
  full_course: "完整課程",
};

export function CourseLearningExperience({
  course,
  lessons,
  isAuthenticated,
}: {
  course: { title: string; description: string | null };
  lessons: CourseLessonView[];
  isAuthenticated: boolean;
}) {
  const [selectedLessonId, setSelectedLessonId] = useState(
    lessons[0]?.id ?? null,
  );
  const [playback, setPlayback] = useState<
    NonNullable<PlaybackResponse["playback"]> | null
  >(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(lessons[0]));
  const lastSyncedSecond = useRef(0);

  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const moduleKeys = Array.from(
    new Set(lessons.map((lesson) => lesson.moduleKey)),
  );

  useEffect(() => {
    if (!selectedLessonId) return;

    const controller = new AbortController();
    setIsLoading(true);
    setPlayback(null);
    setPlaybackError(null);
    lastSyncedSecond.current = 0;

    async function loadPlayback() {
      try {
        const response = await fetch(
          `/api/course/lessons/${encodeURIComponent(selectedLessonId)}/playback`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json()) as PlaybackResponse;

        if (!response.ok || !payload.success || !payload.playback) {
          setPlaybackError(payload.error ?? "目前無法載入影片。");
          return;
        }

        setPlayback(payload.playback);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPlaybackError("目前無法載入影片。");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadPlayback();
    return () => controller.abort();
  }, [selectedLessonId]);

  async function persistProgress(
    status: "in_progress" | "completed",
    progressSeconds: number,
  ) {
    if (!isAuthenticated || !selectedLessonId) return;

    try {
      await fetch("/api/course/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: selectedLessonId, status, progressSeconds }),
        keepalive: true,
      });
    } catch {
      // Playback must continue even when optional progress persistence fails.
    }
  }

  function handleTimeUpdate(event: React.SyntheticEvent<HTMLVideoElement>) {
    const currentSecond = Math.floor(event.currentTarget.currentTime);
    if (currentSecond - lastSyncedSecond.current < 30) return;
    lastSyncedSecond.current = currentSecond;
    void persistProgress("in_progress", currentSecond);
  }

  if (lessons.length === 0) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl shadow-cyan-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
          Course Library
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          目前沒有可觀看的課程單元
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">
          正式影片尚未發布，或你的帳號目前沒有對應的 Lab／完整課程權限。公開試看上架後會直接顯示在這裡。
        </p>
        <Link
          href="/course"
          className="mt-7 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          查看課程方案
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[21rem_1fr]">
      <aside className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-cyan-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
          RAPID Course
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          {course.title}
        </h1>
        {course.description ? (
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {course.description}
          </p>
        ) : null}

        <nav className="mt-6 space-y-5" aria-label="課程單元">
          {moduleKeys.map((moduleKey) => (
            <section key={moduleKey}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {moduleKey}
              </h2>
              <div className="mt-2 space-y-2">
                {lessons
                  .filter((lesson) => lesson.moduleKey === moduleKey)
                  .map((lesson) => {
                    const selected = lesson.id === selectedLessonId;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setSelectedLessonId(lesson.id)}
                        aria-current={selected ? "true" : undefined}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          selected
                            ? "border-cyan-300/40 bg-cyan-400/10 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="block text-sm font-medium">
                          {lesson.title}
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span>{ACCESS_LABELS[lesson.accessLevel]}</span>
                          <span>
                            {lesson.progress?.status === "completed"
                              ? "已完成"
                              : lesson.progress?.status === "in_progress"
                                ? "觀看中"
                                : "未開始"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-cyan-950/20">
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
          {isLoading ? (
            <p className="text-sm text-slate-400">正在確認影片權限...</p>
          ) : playback ? (
            <video
              key={playback.src}
              className="h-full w-full bg-black"
              controls
              controlsList="nodownload"
              playsInline
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onEnded={(event) =>
                void persistProgress(
                  "completed",
                  Math.floor(event.currentTarget.duration || 0),
                )
              }
            >
              <source src={playback.src} type={playback.contentType} />
              你的瀏覽器目前不支援此影片格式。
            </video>
          ) : (
            <p className="px-6 text-center text-sm leading-6 text-amber-100">
              {playbackError ?? "請選擇一個課程單元。"}
            </p>
          )}
        </div>

        {selectedLesson ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                {ACCESS_LABELS[selectedLesson.accessLevel]}
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {selectedLesson.title}
              </h2>
              {selectedLesson.description ? (
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {selectedLesson.description}
                </p>
              ) : null}
            </div>
            {selectedLesson.materialUrl ? (
              <a
                href={selectedLesson.materialUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
              >
                開啟教材
              </a>
            ) : null}
          </div>
        ) : null}

        <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-6 text-slate-500">
          網頁播放器與權限 API 可限制未授權帳號取得播放來源，但任何瀏覽器播放技術都無法完全阻止錄影或已授權使用者轉傳短效來源。
        </p>
      </div>
    </section>
  );
}
