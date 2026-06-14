'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { DIAGNOSIS_STORAGE_KEY } from '@/lib/site';
import type {
  AdvisorStatus,
  DegreeType,
  DiagnosisFormInput,
  MeetingFrequency,
  ResearchStage,
  SubmissionStatus,
  ThesisTopicStatus,
  WritingProgress
} from '@/lib/diagnosis';

const degreeOptions: Array<{ value: DegreeType; label: string }> = [
  { value: 'master', label: '碩士' },
  { value: 'phd', label: '博士' },
  { value: 'pre_grad', label: '準備研究所' },
  { value: 'other', label: '其他' }
];

const stageOptions: Array<{ value: ResearchStage; label: string }> = [
  { value: 'topic', label: '題目 / 開題前' },
  { value: 'literature', label: '文獻閱讀中' },
  { value: 'proposal', label: 'proposal / 計畫中' },
  { value: 'meeting', label: 'Meeting 追進度' },
  { value: 'writing', label: '論文撰寫中' },
  { value: 'submission', label: '投稿準備中' },
  { value: 'defense', label: '口試 / 畢業前' }
];

const thesisTopicOptions: Array<{ value: ThesisTopicStatus; label: string }> = [
  { value: 'none', label: '還沒有題目' },
  { value: 'vague', label: '有方向但不清楚' },
  { value: 'clear', label: '已經明確' }
];

const advisorOptions: Array<{ value: AdvisorStatus; label: string }> = [
  { value: 'none', label: '還沒有' },
  { value: 'seeking', label: '正在找' },
  { value: 'stable', label: '已固定' }
];

const meetingOptions: Array<{ value: MeetingFrequency; label: string }> = [
  { value: 'weekly', label: '每週' },
  { value: 'biweekly', label: '兩週一次' },
  { value: 'monthly', label: '每月一次' },
  { value: 'rare', label: '不固定' }
];

const writingOptions: Array<{ value: WritingProgress; label: string }> = [
  { value: '0-25', label: '0% - 25%' },
  { value: '26-50', label: '26% - 50%' },
  { value: '51-75', label: '51% - 75%' },
  { value: '76-100', label: '76% - 100%' }
];

const submissionOptions: Array<{ value: SubmissionStatus; label: string }> = [
  { value: 'not_started', label: '還沒開始' },
  { value: 'preparing', label: '正在準備' },
  { value: 'submitted', label: '已送出' }
];

function readField(formData: FormData, name: keyof DiagnosisFormInput) {
  return String(formData.get(name) || '').trim();
}

function makePayload(formData: FormData): DiagnosisFormInput {
  return {
    name: readField(formData, 'name'),
    email: readField(formData, 'email'),
    school: readField(formData, 'school'),
    degree_type: readField(formData, 'degree_type') as DegreeType,
    current_year: readField(formData, 'current_year'),
    current_stage: readField(formData, 'current_stage') as ResearchStage,
    thesis_topic_status: readField(formData, 'thesis_topic_status') as ThesisTopicStatus,
    advisor_status: readField(formData, 'advisor_status') as AdvisorStatus,
    meeting_frequency: readField(formData, 'meeting_frequency') as MeetingFrequency,
    writing_progress: readField(formData, 'writing_progress') as WritingProgress,
    submission_status: readField(formData, 'submission_status') as SubmissionStatus,
    current_blocker: readField(formData, 'current_blocker'),
    lead_source: readField(formData, 'lead_source') || 'homepage_guide'
  };
}

export function DiagnosisForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '完成後會直接看到你的結果摘要。'
  });
  const buttonLabel = useMemo(() => (loading ? '送出中...' : '送出並看結果'), [loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = makePayload(formData);

    if (!payload.name || !payload.email || !payload.current_blocker) {
      setStatus({
        type: 'error',
        message: '請至少填寫姓名、Email 與目前最大問題。'
      });
      return;
    }

    setLoading(true);
    setStatus({ type: 'idle', message: '正在分析你的狀況並寫入資料庫...' });

    try {
      const response = await fetch('/api/diagnosis', {
        method: 'POST',
        body: JSON.stringify({
          type: 'diagnosis_submission',
          ...payload
        })
      });
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.message || '送出失敗');
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(result));
      }

      setStatus({ type: 'success', message: '已收到，正在帶你看結果頁。' });
      router.push(`/result?token=${encodeURIComponent(result?.lead?.accessToken || result?.accessToken || '')}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '送出失敗，請稍後再試。';
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    'mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none transition placeholder:text-[#97a6c9] focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]';

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[30px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]"
    >
      <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold text-[#2144b2]">
        診斷表單
      </div>
      <div className="mt-4 grid gap-4">
        <label className="text-sm font-semibold text-[#1f3f9a]">
          姓名
          <input name="name" required placeholder="你的姓名" className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-[#1f3f9a]">
          Email
          <input name="email" type="email" required placeholder="you@example.com" className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-[#1f3f9a]">
          學校
          <input name="school" placeholder="目前或預計就讀學校" className={fieldClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#1f3f9a]">
            學位
            <select name="degree_type" defaultValue="master" className={fieldClass}>
              {degreeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#1f3f9a]">
            目前年級
            <input name="current_year" placeholder="例如：碩二 / 博三" className={fieldClass} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#1f3f9a]">
            目前階段
            <select name="current_stage" defaultValue="writing" className={fieldClass}>
              {stageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#1f3f9a]">
            題目狀態
            <select name="thesis_topic_status" defaultValue="vague" className={fieldClass}>
              {thesisTopicOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#1f3f9a]">
            指導教授
            <select name="advisor_status" defaultValue="seeking" className={fieldClass}>
              {advisorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#1f3f9a]">
            Meeting 頻率
            <select name="meeting_frequency" defaultValue="biweekly" className={fieldClass}>
              {meetingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#1f3f9a]">
            寫作進度
            <select name="writing_progress" defaultValue="26-50" className={fieldClass}>
              {writingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#1f3f9a]">
            投稿狀態
            <select name="submission_status" defaultValue="not_started" className={fieldClass}>
              {submissionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="text-sm font-semibold text-[#1f3f9a]">
          目前最大問題
          <textarea
            name="current_blocker"
            required
            rows={4}
            placeholder="例如：投稿策略卡住、文獻看不懂、Meeting 沒方向、論文寫不動"
            className={fieldClass}
          />
        </label>
        <input type="hidden" name="lead_source" value="homepage_guide" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(33,68,178,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {buttonLabel}
      </button>

      <p
        className={`mt-3 min-h-6 text-sm ${
          status.type === 'error' ? 'text-red-600' : status.type === 'success' ? 'text-emerald-700' : 'text-[#2144b2]'
        }`}
      >
        {status.message}
      </p>
    </form>
  );
}
