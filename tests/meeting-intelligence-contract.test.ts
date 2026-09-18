import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isMeetingIntelligenceAnalysis, trimAnalysis, type MeetingIntelligenceAnalysis } from "../lib/meeting-intelligence/meeting-intelligence-domain";

const migration = readFileSync("supabase/migrations/20260918120000_meeting_intelligence_v1.sql", "utf8");
const launcher = readFileSync("components/meetings/MeetingIntelligenceLauncher.tsx", "utf8");
const confirmRoute = readFileSync("app/api/meeting-intelligence/confirm/route.ts", "utf8");
const uploadRoute = readFileSync("app/api/meeting-intelligence/upload-url/route.ts", "utf8");

test("Meeting Intelligence analysis is strict and never invents a due date", () => {
  const analysis: MeetingIntelligenceAnalysis = {
    summary: "確認實驗方向",
    professorInstructions: [],
    decisions: ["下週回報"],
    blockers: [],
    openQuestions: [],
    suggestedActions: [{ title: "整理結果", ownerType: "student", dueDate: null, dueDateReason: "逐字稿沒有明確日期", sourceText: "整理結果" }],
    advisorSignals: [],
  };
  assert.equal(isMeetingIntelligenceAnalysis(analysis), true);
  assert.equal(trimAnalysis(analysis).suggestedActions[0].dueDate, null);
  assert.equal(isMeetingIntelligenceAnalysis({ ...analysis, suggestedActions: [{ ...analysis.suggestedActions[0], dueDate: "tomorrow" }] }), true);
  assert.equal(trimAnalysis({ ...analysis, suggestedActions: [{ ...analysis.suggestedActions[0], dueDate: "tomorrow" }] }).suggestedActions[0].dueDate, null);
});

test("Meeting Intelligence uses the two approved additive tables and private owner-only storage", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.meeting_recordings/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.meeting_intelligence/);
  assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS public\.(meeting_jobs|meeting_tasks|meeting_transcripts)/);
  assert.match(migration, /ALTER TABLE public\.meeting_recordings ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ALTER TABLE public\.meeting_intelligence ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /meeting-audio/);
  assert.match(migration, /p\.role = 'student'/);
  assert.doesNotMatch(migration, /meeting_intelligence.*professor/);
});

test("AI draft requires explicit student confirmation before canonical writes", () => {
  assert.match(launcher, /AI 草稿，請確認後才會寫入/);
  assert.match(launcher, /確認並寫入 Meeting \/ Actions/);
  assert.match(confirmRoute, /status: "confirmed"/);
  assert.match(confirmRoute, /from\("meeting_actions"\)\.insert/);
  assert.doesNotMatch(uploadRoute, /GROQ_API_KEY/);
});

test("audio bytes use signed direct upload instead of a Next request body", () => {
  assert.match(uploadRoute, /createMeetingUploadUrl/);
  assert.match(launcher, /uploadToSignedUrl/);
  assert.doesNotMatch(launcher, /FormData/);
});
