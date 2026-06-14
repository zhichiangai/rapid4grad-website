export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskForm = {
  current_stage: 'topic' | 'literature' | 'proposal' | 'meeting' | 'writing' | 'submission' | 'defense';
  thesis_topic_status: 'none' | 'vague' | 'clear';
  advisor_status: 'none' | 'seeking' | 'stable';
  meeting_frequency: 'weekly' | 'biweekly' | 'monthly' | 'rare';
  writing_progress: '0-25' | '26-50' | '51-75' | '76-100';
  submission_status: 'not_started' | 'preparing' | 'submitted';
  current_blocker: string;
};

export type RiskResult = {
  score: number;
  level: RiskLevel;
  headline: string;
  biggestRisk: string;
  thisWeekActions: string[];
  meetingQuestions: string[];
  template: string;
  reasons: string[];
  nextSteps: string[];
  summary: string;
};

export type MeetingForm = {
  summary: string;
  professorTone: 'supportive' | 'neutral' | 'strict';
  progressState: 'stuck' | 'moving' | 'almost_done';
  asks: string;
};

export type MeetingResult = {
  statusLabel: string;
  meetingBrief: string;
  completedItems: string[];
  blockers: string[];
  askProfessor: string[];
  nextWeekGoal: string;
  template: string;
  agenda: string[];
  questions: string[];
  followUp: string[];
  summary: string;
};

export type ProgressForm = {
  stage: 'topic' | 'literature' | 'proposal' | 'meeting' | 'writing' | 'submission' | 'defense';
  percent: number;
  deadlineWeeks: 'more_than_12' | '8_to_12' | '4_to_8' | 'less_than_4';
  blocked: boolean;
};

export type ProgressResult = {
  status: 'stable' | 'watch' | 'urgent';
  label: string;
  completionRate: string;
  delayStatus: string;
  weeklyChecklist: string[];
  meetingUpdateSummary: string;
  template: string;
  focus: string[];
  weeklyPlan: string[];
  summary: string;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function containsAny(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

export function evaluateGraduationRisk(form: RiskForm): RiskResult {
  let score = 0;
  const reasons: string[] = [];
  let biggestRisk = '目前整體狀況穩定';
  const blocker = normalizeText(form.current_blocker);
  const thisWeekActions: string[] = [];
  const meetingQuestions: string[] = [];

  if (form.thesis_topic_status === 'none') {
    score += 20;
    reasons.push('題目還沒定下來');
    biggestRisk = '題目尚未定案';
  }
  if (form.thesis_topic_status === 'vague') {
    score += 10;
    reasons.push('題目方向還不夠清楚');
    if (biggestRisk === '目前整體狀況穩定') biggestRisk = '題目方向不夠清楚';
  }

  if (form.advisor_status === 'none') {
    score += 20;
    reasons.push('尚未固定指導教授');
    biggestRisk = '尚未固定指導教授';
  }
  if (form.advisor_status === 'seeking') {
    score += 8;
    reasons.push('正在找教授');
    if (biggestRisk === '目前整體狀況穩定') biggestRisk = '指導教授關係尚未穩定';
  }

  if (form.meeting_frequency === 'rare') {
    score += 18;
    reasons.push('Meeting 頻率偏低');
    if (biggestRisk === '目前整體狀況穩定') biggestRisk = 'Meeting 頻率太低';
  }
  if (form.meeting_frequency === 'monthly') {
    score += 10;
    reasons.push('Meeting 節奏偏慢');
    if (biggestRisk === '目前整體狀況穩定') biggestRisk = 'Meeting 節奏偏慢';
  }

  if (form.writing_progress === '0-25') {
    score += 18;
    reasons.push('論文寫作仍在早期');
    if (biggestRisk === '目前整體狀況穩定') biggestRisk = '寫作仍在早期階段';
  }
  if (form.writing_progress === '26-50') {
    score += 12;
    reasons.push('寫作還在中前段');
    if (biggestRisk === '目前整體狀況穩定') biggestRisk = '寫作還沒進入收斂階段';
  }

  if (form.submission_status === 'not_started') {
    score += 12;
    reasons.push('投稿還沒開始');
    if (biggestRisk === '目前整體狀況穩定') biggestRisk = '投稿準備尚未開始';
  }

  if (containsAny(blocker, ['卡住', '不知道', '沒進度', '延畢', '投稿', '老師'])) {
    score += 12;
    reasons.push('你目前的描述本身就帶有高風險字眼');
    if (biggestRisk === '目前整體狀況穩定') biggestRisk = '你描述的卡點本身就偏高風險';
  }

  const level = getRiskLevel(score);
  const nextSteps = [
    '先把問題縮成一句話',
    '列出今天可以完成的最小任務',
    '把下一次 Meeting 要問的問題整理好'
  ];
  const thisWeek = [
    '把研究卡點寫成 1 句話',
    '列出本週可完成的 3 個最小動作',
    '整理下次 Meeting 的 3 個必問問題'
  ];
  const riskQuestionSet = [
    '這個題目現在最需要先收斂的是哪一部分？',
    '如果只能先做一件事，老師會希望我先做什麼？',
    '下次 Meeting 前我應該要帶來哪些具體成果？'
  ];

  return {
    score: Math.min(score, 100),
    level,
    headline:
      level === 'critical'
        ? '目前是高風險狀態，先把方向與節奏拉回來。'
        : level === 'high'
          ? '風險偏高，先處理最卡的那一段。'
          : level === 'medium'
            ? '有些警訊，但還來得及修正。'
            : '目前狀態還算穩定，重點是維持節奏。',
    biggestRisk,
    thisWeekActions: thisWeek,
    meetingQuestions: riskQuestionSet,
    template: `研究狀態摘要：
目前階段：${form.current_stage}
最大風險：${biggestRisk}
本週行動：
1. ${thisWeek[0]}
2. ${thisWeek[1]}
3. ${thisWeek[2]}
下次 Meeting 要問：
1. ${riskQuestionSet[0]}
2. ${riskQuestionSet[1]}
3. ${riskQuestionSet[2]}`,
    reasons: reasons.length ? reasons : ['目前沒有明顯高風險因子'],
    nextSteps,
    summary: `風險分數 ${Math.min(score, 100)}，目前屬於 ${level}。`
  };
}

export function assistMeeting(form: MeetingForm): MeetingResult {
  const summary = normalizeText(form.summary);
  const asks = normalizeText(form.asks);
  const agenda = [
    '先說明目前進度',
    '再講卡住的地方',
    '最後確認下一步與期限'
  ];

  if (containsAny(summary, ['文獻', '論文', '寫作'])) {
    agenda.splice(1, 0, '補充文獻與寫作進度');
  }

  const questions = [
    '老師最希望我先完成哪一件事？',
    '目前這個方向有沒有需要收斂的地方？',
    '下次 Meeting 前我應該先做到什麼程度？'
  ];

  if (form.professorTone === 'strict') {
    questions.unshift('老師會優先看重哪個成果？');
  }

  const followUp = [
    '會後 24 小時內把待辦整理成清單',
    '把今天 Meeting 的結論寫進下一週計畫',
    '如果有新卡點，下一次 Meeting 前先拆成一題一題處理'
  ];

  if (form.progressState === 'stuck') {
    followUp.unshift('先把卡點寫成一段簡短描述，避免下次又講散');
  }

  const completedItems = [
    '整理本次研究進度',
    '確認目前卡點',
    '準備下次 Meeting 的問題'
  ];
  const blockers = [
    form.progressState === 'stuck' ? '目前進度卡住，需要更明確的下一步' : '目前有持續推進，但還可以再收斂',
    asks ? `你最想釐清的是「${asks.slice(0, 24)}」` : '目前沒有明確指定要問教授的主題'
  ];
  const askProfessor = questions.slice(0, 3);
  const nextWeekGoal =
    form.progressState === 'almost_done'
      ? '把剩下的小問題補完，準備下一輪確認'
      : form.progressState === 'moving'
        ? '完成一個章節或一個小段落'
        : '先把卡點拆成可執行的 3 個小任務';

  if (asks) {
    followUp.push(`額外提醒：把「${asks.slice(0, 24)}」做成一行會後筆記。`);
  }

  return {
    statusLabel:
      form.progressState === 'almost_done'
        ? '快完成了'
        : form.progressState === 'moving'
          ? '持續前進'
          : '需要先解卡',
    meetingBrief:
      form.progressState === 'stuck'
        ? '本次 Meeting 的重點是先釐清卡點，避免把問題帶回下一週。'
        : '本次 Meeting 的重點是確認目前進度，並把下一步收斂成可執行動作。',
    completedItems,
    blockers,
    askProfessor,
    nextWeekGoal,
    template: `Meeting Brief
本次重點：${summary || '請先說明目前進度與卡點'}
已完成事項：
1. ${completedItems[0]}
2. ${completedItems[1]}
3. ${completedItems[2]}
卡點：
1. ${blockers[0]}
2. ${blockers[1]}
想請教教授：
1. ${askProfessor[0]}
2. ${askProfessor[1]}
3. ${askProfessor[2]}
下週目標：${nextWeekGoal}`,
    agenda,
    questions,
    followUp,
    summary: '這份 Meeting 建議會把你的內容整理成老師最容易接的版本。'
  };
}

export function trackProgress(form: ProgressForm): ProgressResult {
  const focus: string[] = [];
  const weeklyPlan: string[] = [];
  const weeklyChecklist: string[] = [];

  if (form.stage === 'topic') {
    focus.push('先把題目縮成一句話');
    weeklyPlan.push('找 3 篇最相關文獻');
    weeklyPlan.push('寫出研究問題草稿');
    weeklyChecklist.push('完成題目一句話版本', '整理 3 篇核心文獻', '寫出研究問題草稿');
  }

  if (form.stage === 'writing') {
    focus.push('先完成章節結構');
    weeklyPlan.push('把本週拆成 3 段寫作');
    weeklyPlan.push('補齊引用與圖表');
    weeklyChecklist.push('完成章節結構', '寫完本週分段內容', '補齊引用與圖表');
  }

  if (form.deadlineWeeks === 'less_than_4') {
    focus.push('時間已經很緊，先鎖定最小可完成版本');
  } else if (form.deadlineWeeks === '4_to_8') {
    focus.push('要加快輸出節奏');
  } else {
    focus.push('可以先穩定節奏');
  }

  if (form.blocked) {
    focus.unshift('你目前被卡住了，先處理阻塞點');
    weeklyPlan.unshift('今天先解除一個卡點');
    weeklyChecklist.unshift('先解除一個卡點');
  }

  const status: ProgressResult['status'] =
    form.blocked || form.percent < 35
      ? 'urgent'
      : form.percent < 70
        ? 'watch'
        : 'stable';

  return {
    status,
    label:
      status === 'urgent'
        ? '需要立刻處理'
        : status === 'watch'
          ? '持續觀察'
        : '進度穩定',
    completionRate: `${Math.max(0, Math.min(form.percent, 100))}%`,
    delayStatus:
      form.blocked || form.percent < 35
        ? '落後，需要立刻處理'
        : form.percent < 70
          ? '略為落後，需要穩定推進'
          : '進度正常',
    weeklyChecklist: weeklyChecklist.length ? weeklyChecklist : ['確認目前進度', '整理下一段要做的內容', '和教授確認下一步'],
    meetingUpdateSummary: `目前完成度 ${Math.max(0, Math.min(form.percent, 100))}%，狀態為 ${form.blocked ? '卡住' : '可持續推進'}。`,
    template: `Progress Update
完成率：${Math.max(0, Math.min(form.percent, 100))}%
落後程度：${form.blocked || form.percent < 35 ? '落後' : form.percent < 70 ? '略為落後' : '正常'}
本週 Checklist：
1. ${weeklyChecklist[0] || '確認目前進度'}
2. ${weeklyChecklist[1] || '整理下一段要做的內容'}
3. ${weeklyChecklist[2] || '和教授確認下一步'}
下次 Meeting 更新摘要：${`目前完成度 ${Math.max(0, Math.min(form.percent, 100))}%，狀態為 ${form.blocked ? '卡住' : '可持續推進'}。`}`,
    focus,
    weeklyPlan,
    summary: `目前完成度 ${form.percent}%。`
  };
}
