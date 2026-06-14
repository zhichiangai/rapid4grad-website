'use client';

import { useMemo, useState } from 'react';
import {
  assistMeeting,
  evaluateGraduationRisk,
  trackProgress,
  type MeetingForm,
  type ProgressForm,
  type RiskForm
} from '@/lib/free-tools';

const stageOptions: Array<{ value: RiskForm['current_stage']; label: string }> = [
  { value: 'topic', label: '題目 / 開題前' },
  { value: 'literature', label: '文獻閱讀中' },
  { value: 'proposal', label: 'proposal / 計畫中' },
  { value: 'meeting', label: 'Meeting 追進度' },
  { value: 'writing', label: '論文撰寫中' },
  { value: 'submission', label: '投稿準備中' },
  { value: 'defense', label: '口試 / 畢業前' }
];

function sectionCard() {
  return 'rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]';
}

function fieldClass() {
  return 'mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none transition placeholder:text-[#97a6c9] focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]';
}

function panelClass() {
  return 'rounded-[30px] border border-[#dbe6ff] bg-[#f8faff] p-6';
}

export function FreeToolsHub() {
  const [riskForm, setRiskForm] = useState<RiskForm>({
    current_stage: 'writing',
    thesis_topic_status: 'vague',
    advisor_status: 'seeking',
    meeting_frequency: 'biweekly',
    writing_progress: '26-50',
    submission_status: 'not_started',
    current_blocker: '論文寫作卡住，不知道下一步'
  });

  const [meetingForm, setMeetingForm] = useState<MeetingForm>({
    summary: '這次想確認論文方向與下一次 Meeting 前要做什麼',
    professorTone: 'neutral',
    progressState: 'stuck',
    asks: '投稿策略'
  });

  const [progressForm, setProgressForm] = useState<ProgressForm>({
    stage: 'writing',
    percent: 45,
    deadlineWeeks: '4_to_8',
    blocked: true
  });

  const riskResult = useMemo(() => evaluateGraduationRisk(riskForm), [riskForm]);
  const meetingResult = useMemo(() => assistMeeting(meetingForm), [meetingForm]);
  const progressResult = useMemo(() => trackProgress(progressForm), [progressForm]);

  return (
    <div className="grid gap-6">
      <section id="risk-checker" className={sectionCard()}>
        <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
          01 · Graduation Risk Checker
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-black text-[#10203a]">30 秒看出你的畢業風險</h2>
            <p className="mt-3 text-[15px] leading-7 text-[#62708d]">
              不用 AI，先用規則引擎幫你判斷目前是不是該優先處理題目、Meeting、寫作或投稿。
            </p>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-semibold text-[#1f3f9a]">
                目前階段
                <select
                  className={fieldClass()}
                  value={riskForm.current_stage}
                  onChange={(event) => setRiskForm((prev) => ({ ...prev, current_stage: event.target.value as RiskForm['current_stage'] }))}
                >
                  {stageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                題目狀態
                <select
                  className={fieldClass()}
                  value={riskForm.thesis_topic_status}
                  onChange={(event) => setRiskForm((prev) => ({ ...prev, thesis_topic_status: event.target.value as RiskForm['thesis_topic_status'] }))}
                >
                  <option value="none">還沒有題目</option>
                  <option value="vague">有方向但不清楚</option>
                  <option value="clear">已經明確</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                目前最大問題
                <textarea
                  className={fieldClass()}
                  rows={3}
                  value={riskForm.current_blocker}
                  onChange={(event) => setRiskForm((prev) => ({ ...prev, current_blocker: event.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[30px] bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-6 text-white shadow-[0_18px_44px_rgba(33,68,178,0.24)]">
            <div className="text-xs font-semibold tracking-[0.16em] text-white/78">交付物</div>
            <div className="mt-3 text-5xl font-black">{riskResult.score}</div>
            <div className="mt-2 inline-flex rounded-full border border-white/16 bg-white/12 px-3 py-1 text-sm font-bold">
              {riskResult.level.toUpperCase()}
            </div>
            <p className="mt-4 text-[16px] leading-8 text-white/86">{riskResult.headline}</p>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
                <div className="text-xs font-bold tracking-[0.14em] text-white/66">最大風險</div>
                <div className="mt-2 text-lg font-extrabold text-white">{riskResult.biggestRisk}</div>
              </div>
              {riskResult.reasons.map((reason) => (
                <div key={reason} className="rounded-2xl border border-white/12 bg-white/10 p-4 text-sm leading-6 text-white/88">
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className={panelClass()}>
            <div className="text-xs font-bold tracking-[0.14em] text-[#2860f2]">本週三件事</div>
            <ul className="mt-3 grid gap-2">
              {riskResult.thisWeekActions.map((item) => (
                <li key={item} className="rounded-2xl bg-white p-3 text-sm leading-6 text-[#20304b] shadow-[0_8px_16px_rgba(18,39,92,0.04)]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className={panelClass()}>
            <div className="text-xs font-bold tracking-[0.14em] text-[#2860f2]">下次 Meeting 要問</div>
            <ul className="mt-3 grid gap-2">
              {riskResult.meetingQuestions.map((item) => (
                <li key={item} className="rounded-2xl bg-white p-3 text-sm leading-6 text-[#20304b] shadow-[0_8px_16px_rgba(18,39,92,0.04)]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className={panelClass()}>
            <div className="text-xs font-bold tracking-[0.14em] text-[#2860f2]">可直接使用的內容模板</div>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-[22px] bg-[#eef4ff] p-4 text-sm leading-7 text-[#20304b]">
              {riskResult.template}
            </pre>
          </div>
        </div>
      </section>

      <section id="meeting-assistant" className={sectionCard()}>
        <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
          02 · Meeting Assistant
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="text-3xl font-black text-[#10203a]">把 Meeting 內容變成可執行的待辦</h2>
            <p className="mt-3 text-[15px] leading-7 text-[#62708d]">
              先用固定規則整理會議內容，讓你在會後就能直接知道下一步。
            </p>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-semibold text-[#1f3f9a]">
                會議摘要
                <textarea
                  className={fieldClass()}
                  rows={3}
                  value={meetingForm.summary}
                  onChange={(event) => setMeetingForm((prev) => ({ ...prev, summary: event.target.value }))}
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                教授溝通風格
                <select
                  className={fieldClass()}
                  value={meetingForm.professorTone}
                  onChange={(event) => setMeetingForm((prev) => ({ ...prev, professorTone: event.target.value as MeetingForm['professorTone'] }))}
                >
                  <option value="supportive">支持型</option>
                  <option value="neutral">中性</option>
                  <option value="strict">嚴格型</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                你目前狀態
                <select
                  className={fieldClass()}
                  value={meetingForm.progressState}
                  onChange={(event) => setMeetingForm((prev) => ({ ...prev, progressState: event.target.value as MeetingForm['progressState'] }))}
                >
                  <option value="stuck">卡住</option>
                  <option value="moving">有在前進</option>
                  <option value="almost_done">快完成了</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                想問的重點
                <input
                  className={fieldClass()}
                  value={meetingForm.asks}
                  onChange={(event) => setMeetingForm((prev) => ({ ...prev, asks: event.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#dbe6ff] bg-[#f8faff] p-6">
            <div className="text-sm font-bold text-[#2144b2]">交付物</div>
            <div className="mt-4 rounded-[24px] border border-[#dbe6ff] bg-white p-4">
              <div className="text-xs font-bold tracking-[0.14em] text-[#2860f2]">Meeting Brief</div>
              <p className="mt-2 text-sm leading-7 text-[#20304b]">{meetingResult.meetingBrief}</p>
              <div className="mt-4 inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#2144b2]">
                {meetingResult.statusLabel}
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div>
                <div className="text-xs font-bold text-[#62708d]">已完成事項</div>
                <ul className="mt-2 grid gap-2">
                  {meetingResult.completedItems.map((item) => (
                    <li key={item} className="rounded-2xl bg-white p-3 text-sm leading-6 text-[#20304b] shadow-[0_8px_16px_rgba(18,39,92,0.04)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold text-[#62708d]">卡點</div>
                <ul className="mt-2 grid gap-2">
                  {meetingResult.blockers.map((item) => (
                    <li key={item} className="rounded-2xl bg-white p-3 text-sm leading-6 text-[#20304b] shadow-[0_8px_16px_rgba(18,39,92,0.04)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold text-[#62708d]">想請教教授</div>
                <ul className="mt-2 grid gap-2">
                  {meetingResult.askProfessor.map((item) => (
                    <li key={item} className="rounded-2xl border border-[#dbe6ff] bg-white p-3 text-sm leading-6 text-[#20304b]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold text-[#62708d]">下週目標</div>
                <div className="mt-2 rounded-2xl border border-[#dbe6ff] bg-white p-3 text-sm leading-7 text-[#20304b]">
                  {meetingResult.nextWeekGoal}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className={panelClass()}>
            <div className="text-xs font-bold tracking-[0.14em] text-[#2860f2]">會前 / 會後參考</div>
            <div className="mt-3 grid gap-2">
              {meetingResult.followUp.map((item) => (
                <div key={item} className="rounded-2xl bg-white p-3 text-sm leading-6 text-[#20304b] shadow-[0_8px_16px_rgba(18,39,92,0.04)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className={panelClass()}>
            <div className="text-xs font-bold tracking-[0.14em] text-[#2860f2]">可直接使用的內容模板</div>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-[22px] bg-[#eef4ff] p-4 text-sm leading-7 text-[#20304b]">
              {meetingResult.template}
            </pre>
          </div>
        </div>
      </section>

      <section id="progress-tracker" className={sectionCard()}>
        <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
          03 · Thesis Progress Tracker
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[30px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6">
            <h2 className="text-3xl font-black text-[#10203a]">把論文進度變成一條清楚的路線</h2>
            <p className="mt-3 text-[15px] leading-7 text-[#62708d]">
              先讓學生感覺到「我不是沒進度，而是進度沒被看見」。
            </p>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-semibold text-[#1f3f9a]">
                目前階段
                <select
                  className={fieldClass()}
                  value={progressForm.stage}
                  onChange={(event) => setProgressForm((prev) => ({ ...prev, stage: event.target.value as ProgressForm['stage'] }))}
                >
                  {stageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                完成度
                <input
                  className={fieldClass()}
                  type="number"
                  min={0}
                  max={100}
                  value={progressForm.percent}
                  onChange={(event) => setProgressForm((prev) => ({ ...prev, percent: Number(event.target.value) || 0 }))}
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                距離 deadline
                <select
                  className={fieldClass()}
                  value={progressForm.deadlineWeeks}
                  onChange={(event) => setProgressForm((prev) => ({ ...prev, deadlineWeeks: event.target.value as ProgressForm['deadlineWeeks'] }))}
                >
                  <option value="more_than_12">12 週以上</option>
                  <option value="8_to_12">8 到 12 週</option>
                  <option value="4_to_8">4 到 8 週</option>
                  <option value="less_than_4">4 週內</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-[#dbe6ff] bg-white p-4 text-sm font-semibold text-[#1f3f9a]">
                <input
                  type="checkbox"
                  checked={progressForm.blocked}
                  onChange={(event) => setProgressForm((prev) => ({ ...prev, blocked: event.target.checked }))}
                />
                目前有卡住嗎？
              </label>
            </div>
          </div>

          <div className="rounded-[30px] bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-6 text-white shadow-[0_18px_44px_rgba(33,68,178,0.24)]">
            <div className="text-xs font-semibold tracking-[0.16em] text-white/78">交付物</div>
            <div className="mt-3 text-5xl font-black">{progressResult.completionRate}</div>
            <div className="mt-2 inline-flex rounded-full border border-white/16 bg-white/12 px-3 py-1 text-sm font-bold">
              {progressResult.label}
            </div>
            <p className="mt-4 text-[16px] leading-8 text-white/86">{progressResult.meetingUpdateSummary}</p>
            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
                <div className="text-xs font-bold tracking-[0.14em] text-white/66">落後程度</div>
                <div className="mt-2 text-lg font-extrabold text-white">{progressResult.delayStatus}</div>
              </div>
              {progressResult.focus.map((item) => (
                <div key={item} className="rounded-2xl border border-white/12 bg-white/10 p-4 text-sm leading-6 text-white/88">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className={panelClass()}>
            <div className="text-xs font-bold tracking-[0.14em] text-[#2860f2]">本週 Checklist</div>
            <ul className="mt-3 grid gap-2">
              {progressResult.weeklyChecklist.map((item) => (
                <li key={item} className="rounded-2xl bg-white p-3 text-sm leading-6 text-[#20304b] shadow-[0_8px_16px_rgba(18,39,92,0.04)]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className={panelClass()}>
            <div className="text-xs font-bold tracking-[0.14em] text-[#2860f2]">可直接使用的內容模板</div>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-[22px] bg-[#eef4ff] p-4 text-sm leading-7 text-[#20304b]">
              {progressResult.template}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
