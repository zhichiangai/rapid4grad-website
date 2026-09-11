import "server-only";

import type { ProfessorAiContextType, ProfessorAiProposal } from "@/lib/professor/ai-contract";
import { PROFESSOR_AI_INTENTS, isProfessorAiContextType, isProfessorAiIntent, validateProposal } from "@/lib/professor/ai-contract";

export const GROQ_TEXT_MODEL = "openai/gpt-oss-20b";
export const GROQ_REASONING_MODEL = "openai/gpt-oss-120b";
export const GROQ_STT_MODEL = "whisper-large-v3-turbo";
export const GROQ_PRECISION_STT_MODEL = "whisper-large-v3";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const proposalSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: [...PROFESSOR_AI_INTENTS] },
    title: { type: "string" },
    explanation: { type: "string" },
    contextType: { type: "string", enum: ["dashboard", "student", "lab"] },
    labId: { type: ["string", "null"] },
    studentId: { type: ["string", "null"] },
    meetingId: { type: ["string", "null"] },
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
        targetDate: { type: ["string", "null"] },
        resourceUrl: { type: ["string", "null"] },
        dueDate: { type: ["string", "null"] },
        ownerType: { type: ["string", "null"], enum: ["student", "supervisor", null] },
      },
      required: ["title", "description", "targetDate", "resourceUrl", "dueDate", "ownerType"],
    },
  },
  required: ["intent", "title", "explanation", "contextType", "labId", "studentId", "meetingId", "fields"],
} as const;

export function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function assertGroqConfigured() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY_CONFIGURATION_REQUIRED");
}

function approvedTextModel(model?: string) {
  return model === GROQ_REASONING_MODEL ? GROQ_REASONING_MODEL : GROQ_TEXT_MODEL;
}

function providerError() {
  return new Error("GROQ_PROVIDER_REQUEST_FAILED");
}

async function groqJson(path: string, init: RequestInit, timeoutMs: number) {
  const response = await fetch(`${GROQ_BASE_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !body) throw providerError();
  return body;
}

function parseProposal(value: unknown): ProfessorAiProposal {
  if (!value || typeof value !== "object") throw new Error("GROQ_INVALID_PROPOSAL");
  const candidate = value as Record<string, unknown>;
  const fields = candidate.fields;
  if (!fields || typeof fields !== "object") throw new Error("GROQ_INVALID_PROPOSAL");
  const rawFields = fields as Record<string, unknown>;
  const proposal: ProfessorAiProposal = {
    intent: candidate.intent as ProfessorAiProposal["intent"],
    title: typeof candidate.title === "string" ? candidate.title.trim().slice(0, 200) : "",
    explanation: typeof candidate.explanation === "string" ? candidate.explanation.trim().slice(0, 2000) : "",
    contextType: candidate.contextType as ProfessorAiContextType,
    labId: typeof candidate.labId === "string" ? candidate.labId : null,
    studentId: typeof candidate.studentId === "string" ? candidate.studentId : null,
    meetingId: typeof candidate.meetingId === "string" ? candidate.meetingId : null,
    fields: {
      title: typeof rawFields.title === "string" ? rawFields.title.trim().slice(0, 200) : undefined,
      description: typeof rawFields.description === "string" ? rawFields.description.trim().slice(0, 2000) : undefined,
      targetDate: typeof rawFields.targetDate === "string" ? rawFields.targetDate : undefined,
      resourceUrl: typeof rawFields.resourceUrl === "string" ? rawFields.resourceUrl.trim().slice(0, 2000) : undefined,
      dueDate: typeof rawFields.dueDate === "string" ? rawFields.dueDate : null,
      ownerType: rawFields.ownerType === "student" || rawFields.ownerType === "supervisor" ? rawFields.ownerType : undefined,
    },
  };
  if (!isProfessorAiIntent(proposal.intent) || !isProfessorAiContextType(proposal.contextType) || validateProposal(proposal)) throw new Error("GROQ_INVALID_PROPOSAL");
  return proposal;
}

export async function extractProfessorProposal(input: { message: string; context: unknown; contextType: ProfessorAiContextType; labId: string | null; studentId: string | null; model?: string }): Promise<{ proposal: ProfessorAiProposal; inputTokens: number | null; outputTokens: number | null; providerModel: string }> {
  assertGroqConfigured();
  const model = approvedTextModel(input.model);
  const body = await groqJson("/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_completion_tokens: 1200,
      reasoning_effort: model === GROQ_REASONING_MODEL ? "low" : "none",
      response_format: {
        type: "json_schema",
        json_schema: { name: "professor_ai_proposal", strict: true, schema: proposalSchema },
      },
      messages: [
        {
          role: "system",
          content: "你是 RAPID4GRAD 的 Professor Supervision AI。只根據提供的已授權 Lab-scoped context 回傳 JSON proposal。不得捏造研究進度、實驗結果、Thesis progress 或個人風險。不得要求或輸出私人 Thesis、私人 Graduation Risk、raw PDF、完整資料庫、cookie、token 或 credentials。讀取型 intent 只整理事實；寫入型 intent 只能提出 proposal，永遠不要直接宣稱已寫入資料。",
        },
        {
          role: "user",
          content: JSON.stringify({ request: input.message.slice(0, 2000), contextType: input.contextType, labId: input.labId, studentId: input.studentId, authorizedContext: input.context }),
        },
      ],
    }),
  }, 30_000);
  const choices = body.choices;
  const content = Array.isArray(choices) && choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>).message : null;
  const rawContent = content && typeof content === "object" ? (content as Record<string, unknown>).content : null;
  if (typeof rawContent !== "string") throw new Error("GROQ_INVALID_PROPOSAL");
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error("GROQ_INVALID_PROPOSAL");
  }
  const usage = body.usage && typeof body.usage === "object" ? body.usage as Record<string, unknown> : {};
  return {
    proposal: parseProposal(parsed),
    inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : null,
    outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : null,
    providerModel: model,
  };
}

export async function transcribeProfessorAudio(file: File, model = GROQ_STT_MODEL): Promise<string> {
  assertGroqConfigured();
  if (file.size === 0 || file.size > MAX_AUDIO_BYTES) throw new Error("GROQ_AUDIO_TOO_LARGE");
  const form = new FormData();
  form.append("file", new Blob([await file.arrayBuffer()], { type: file.type || "audio/webm" }), file.name || "rapid-voice.webm");
  form.append("model", model === GROQ_PRECISION_STT_MODEL ? GROQ_PRECISION_STT_MODEL : GROQ_STT_MODEL);
  form.append("response_format", "json");
  form.append("temperature", "0");
  const body = await groqJson("/audio/transcriptions", { method: "POST", body: form }, 60_000);
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 8_000) : "";
  if (!text) throw new Error("GROQ_TRANSCRIPTION_EMPTY");
  return text;
}
