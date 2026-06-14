'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { DIAGNOSIS_STORAGE_KEY } from '@/lib/site';
import { buildDiagnosisResult, createLocalStorageSnapshot, type DegreeType, type DiagnosisFormInput } from '@/lib/diagnosis';

const degreeOptions: Array<{ value: DegreeType; label: string }> = [
  { value: 'master', label: '碩士' },
  { value: 'phd', label: '博士' }
];

const pressureOptions: Array<{ value: DiagnosisFormInput['submission_pressure']; label: string }> = [
  { value: 'none', label: '目前還沒有' },
  { value: 'some', label: '有一些壓力' },
  { value: 'urgent', label: '壓力很大' }
];

function readField(formData: FormData, name: keyof DiagnosisFormInput) {
  return String(formData.get(name) || '').trim();
}

function buildDerivedPayload(formData: FormData): DiagnosisFormInput {
  const hasTopic = readField(formData, 'has_topic') === 'yes' ? 'yes' : 'no';
  const fixedMeeting = readField(formData, 'fixed_meeting') === 'yes' ? 'yes' : 'no';
  const writingStarted = readField(formData, 'writing_started') === 'yes' ? 'yes' : 'no';
  const submissionPressure = readField(formData, 'submission_pressure') as DiagnosisFormInput['submission_pressure'];

  return {
    name: readField(formData, 'name'),
    email: readField(formData, 'email'),
    school: readField(formData, 'school'),
    department: readField(formData, 'department'),
    degree_type: readField(formData, 'degree_type') as DegreeType,
    current_year: readField(formData, 'current_year'),
    has_topic: hasTopic,
    fixed_meeting: fixedMeeting,
    writing_started: writingStarted,
    submission_pressure: submissionPressure,
    current_blocker: readField(formData, 'current_blocker'),
    lead_source: readField(formData, 'lead_source') || 'diagnosis_page',
    current_stage: 'proposal',
    thesis_topic_status: hasTopic === 'yes' ? 'clear' : 'none',
    advisor_status: fixedMeeting === 'yes' ? 'stable' : 'none',
    meeting_frequency: fixedMeeting === 'yes' ? 'biweekly' : 'rare',
    writing_progress: writingStarted === 'yes' ? (submissionPressure === 'urgent' ? '76-100' : submissionPressure === 'some' ? '51-75' : '26-50') : '0-25',
    submission_status: submissionPressure === 'none' ? 'not_started' : 'preparing'
  };
}

export function DiagnosisForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '完成後會直接看到你的結果摘要。'
  });
  const buttonLabel = useMemo(() => (loading ? '送出中...' : '開始畢業診斷'), [loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = buildDerivedPayload(formData);

    if (!payload.name || !payload.email || !payload.department || !payload.current_blocker) {
      setStatus({
        type: 'error',
        message: '請至少填寫姓名、Email、科系與目前最大問題。'
      });
      return;
    }

    setLoading(true);
    setStatus({ type: 'idle', message: '正在計算你的畢業診斷...' });

    try {
      const result = buildDiagnosisResult(payload, 'lead_local', 'token_local', 'diag_local');
      const snapshot = createLocalStorageSnapshot(payload, result);
      window.localStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(snapshot));
      setStatus({ type: 'success', message: '已完成診斷，正在帶你看結果頁。' });
      router.push('/result');
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
    <form onSubmit={onSubmit} className="rounded-[30px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#1f3f9a]">
            學校
            <input name="school" placeholder="目前就讀學校" className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-[#1f3f9a]">
            科系
            <input name="department" required placeholder="例如：資管所 / 中文系" className={fieldClass} />
          </label>
        </div>
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
            年級
            <input name="current_year" placeholder="例如：碩二 / 博三" className={fieldClass} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#1f3f9a]">
            是否已有題目
            <select name="has_topic" defaultValue="no" className={fieldClass}>
              <option value="no">還沒有</option>
              <option value="yes">已經有</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-[#1f3f9a]">
            是否固定 Meeting
            <select name="fixed_meeting" defaultValue="no" className={fieldClass}>
              <option value="no">還不固定</option>
              <option value="yes">有固定</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#1f3f9a]">
            是否開始寫論文
            <select name="writing_started" defaultValue="no" className={fieldClass}>
              <option value="no">還沒開始</option>
              <option value="yes">已經開始</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-[#1f3f9a]">
            是否有投稿壓力
            <select name="submission_pressure" defaultValue="none" className={fieldClass}>
              {pressureOptions.map((option) => (
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
            placeholder="例如：題目還沒定、Meeting 沒方向、論文寫不動、投稿節奏很亂"
            className={fieldClass}
          />
        </label>
        <input type="hidden" name="lead_source" value="diagnosis_page" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(33,68,178,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {buttonLabel}
        </button>
        <p className={`text-sm ${status.type === 'error' ? 'text-[#b23d66]' : status.type === 'success' ? 'text-[#1d7b52]' : 'text-[#62708d]'}`}>
          {status.message}
        </p>
      </div>
    </form>
  );
}
