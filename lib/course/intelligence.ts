export type IntelligenceSession = {
  lesson_id: string;
  user_id: string;
  duration_seconds: number | null;
  last_position_seconds: number;
  max_position_seconds: number;
  watch_time_seconds: number;
  completed_at: string | null;
  created_at?: string | null;
};

export type IntelligenceVersion = {
  id: string;
  lesson_id: string;
  version_number: number;
  video_provider: string;
  mux_asset_id: string | null;
  playback_id: string | null;
  status: "processing" | "ready" | "retired" | "errored";
  duration_seconds: number | null;
  activated_at: string | null;
  retired_at: string | null;
  created_at: string;
};

export type IntelligenceSegment = {
  lesson_id: string;
  user_id: string;
  start_seconds: number;
  end_seconds: number;
  transition_kind: "continuous" | "forward_skip" | "backward_replay";
};

export type IntelligenceQuestion = {
  id?: string;
  lesson_id: string;
  timestamp_seconds: number;
  kind: "question" | "unclear";
  status: "open" | "answered" | "resolved";
  body?: string | null;
  admin_answer?: string | null;
};

export type LessonIntelligence = {
  lessonId: string;
  learners: number;
  starts: number;
  completionRate: number | null;
  averageWatchSeconds: number | null;
  reached50: number;
  reached80: number;
  reached95: number;
  questions: number;
  unclearSignals: number;
  replayHotspots: number;
  dropOffHotspots: number;
  sampleMessage: string | null;
};

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : null;
}

export function aggregateLessonIntelligence(
  lessonId: string,
  sessions: IntelligenceSession[],
  segments: IntelligenceSegment[],
  questions: IntelligenceQuestion[],
): LessonIntelligence {
  const lessonSessions = sessions.filter((item) => item.lesson_id === lessonId);
  const lessonSegments = segments.filter((item) => item.lesson_id === lessonId);
  const lessonQuestions = questions.filter((item) => item.lesson_id === lessonId);
  const users = new Set(lessonSessions.map((item) => item.user_id));
  const completed = lessonSessions.filter((item) => Boolean(item.completed_at));
  const reached = (threshold: number) => lessonSessions.filter((item) => {
    if (!item.duration_seconds || item.duration_seconds <= 0) return false;
    return item.max_position_seconds >= item.duration_seconds * threshold;
  }).length;
  const averageWatchSeconds = lessonSessions.length
    ? Math.round(lessonSessions.reduce((sum, item) => sum + item.watch_time_seconds, 0) / lessonSessions.length)
    : null;
  const replayHotspots = lessonSegments.filter((item) => item.transition_kind === "backward_replay").length;
  const incomplete = lessonSessions.filter((item) => !item.completed_at && item.last_position_seconds > 1);
  const dropOffHotspots = incomplete.length >= 3 ? 1 : 0;

  return {
    lessonId,
    learners: users.size,
    starts: lessonSessions.length,
    completionRate: percentage(completed.length, lessonSessions.length),
    averageWatchSeconds,
    reached50: reached(0.5),
    reached80: reached(0.8),
    reached95: reached(0.95),
    questions: lessonQuestions.filter((item) => item.kind === "question").length,
    unclearSignals: lessonQuestions.filter((item) => item.kind === "unclear").length,
    replayHotspots,
    dropOffHotspots,
    sampleMessage: users.size < 3
      ? users.size === 0 ? "尚未有觀看資料" : "資料仍在累積"
      : null,
  };
}

export function formatWatchTime(seconds: number | null) {
  if (seconds === null) return "-";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
