export type DegreeType = 'master' | 'phd' | 'pre_grad' | 'other';
export type ResearchStage =
  | 'topic'
  | 'literature'
  | 'proposal'
  | 'meeting'
  | 'writing'
  | 'submission'
  | 'defense';
export type ThesisTopicStatus = 'none' | 'vague' | 'clear';
export type AdvisorStatus = 'none' | 'seeking' | 'stable';
export type MeetingFrequency = 'weekly' | 'biweekly' | 'monthly' | 'rare';
export type WritingProgress = '0-25' | '26-50' | '51-75' | '76-100';
export type SubmissionStatus = 'not_started' | 'preparing' | 'submitted';

export type DiagnosisFormInput = {
  name: string;
  email: string;
  school: string;
  degree_type: DegreeType;
  current_year: string;
  current_stage: ResearchStage;
  thesis_topic_status: ThesisTopicStatus;
  advisor_status: AdvisorStatus;
  meeting_frequency: MeetingFrequency;
  writing_progress: WritingProgress;
  submission_status: SubmissionStatus;
  current_blocker: string;
  lead_source: string;
};

export type ResourceItem = {
  label: string;
  description: string;
  href: string;
};

export type DiagnosisResult = {
  leadId: string;
  accessToken: string;
  diagnosisId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  stageLabel: string;
  blockerLabel: string;
  summary: string;
  nextSteps: string[];
  resources: ResourceItem[];
  todayTasks: string[];
  weeklyTasks: string[];
  dashboardUrl: string;
  welcomeMessage: string;
};

const DEGREE_LABELS: Record<DegreeType, string> = {
  master: '碩士生',
  phd: '博士生',
  pre_grad: '準備研究所',
  other: '研究生'
};

const STAGE_LABELS: Record<ResearchStage, string> = {
  topic: '題目 / 開題前',
  literature: '文獻閱讀中',
  proposal: 'proposal / 計畫中',
  meeting: 'Meeting 追進度',
  writing: '論文撰寫中',
  submission: '投稿準備中',
  defense: '口試 / 畢業前'
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function containsAny(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

function scoreRisk(input: DiagnosisFormInput) {
  let score = 0;

  if (input.thesis_topic_status === 'none') score += 20;
  if (input.thesis_topic_status === 'vague') score += 12;

  if (input.advisor_status === 'none') score += 20;
  if (input.advisor_status === 'seeking') score += 8;

  if (input.meeting_frequency === 'rare') score += 18;
  if (input.meeting_frequency === 'monthly') score += 10;
  if (input.meeting_frequency === 'biweekly') score += 4;

  if (input.writing_progress === '0-25') score += 20;
  if (input.writing_progress === '26-50') score += 12;
  if (input.writing_progress === '51-75') score += 6;

  if (input.submission_status === 'not_started') score += 12;
  if (input.submission_status === 'preparing') score += 5;

  if (input.current_stage === 'topic') score += 12;
  if (input.current_stage === 'literature') score += 8;
  if (input.current_stage === 'proposal') score += 8;
  if (input.current_stage === 'writing') score += 6;

  const blocker = normalizeText(input.current_blocker);
  if (containsAny(blocker, ['延畢', '投稿', '卡住', '不知道', '沒進度'])) {
    score += 10;
  }

  return Math.min(score, 100);
}

function getRiskLevel(score: number): DiagnosisResult['riskLevel'] {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function buildSummary(input: DiagnosisFormInput, riskLevel: DiagnosisResult['riskLevel']) {
  const degree = DEGREE_LABELS[input.degree_type];
  const stage = STAGE_LABELS[input.current_stage];
  const blocker = normalizeText(input.current_blocker);

  if (riskLevel === 'critical') {
    return `${degree}目前在${stage}，而且主要卡點是「${blocker}」。現在最重要的是先把題目、Meeting 與寫作順序重新排好。`;
  }

  if (riskLevel === 'high') {
    return `${degree}目前在${stage}，主要問題是「${blocker}」。你已經接近需要加速的階段，先把下一步做清楚會最有效。`;
  }

  if (riskLevel === 'medium') {
    return `${degree}目前在${stage}，還有一些明顯的卡點需要處理。只要先把順序排好，進度就能穩定推進。`;
  }

  return `${degree}目前在${stage}，整體狀態相對穩定。你現在適合把節奏維持住，避免小問題累積成大卡關。`;
}

function buildNextSteps(input: DiagnosisFormInput, riskLevel: DiagnosisResult['riskLevel']) {
  const blocker = normalizeText(input.current_blocker);
  const stage = input.current_stage;

  if (containsAny(blocker, ['投稿'])) {
    return [
      '先把目標期刊縮小到 2 到 3 個',
      '整理目前論文缺口與格式要求',
      '先完成投稿前 check list'
    ];
  }

  if (containsAny(blocker, ['Meeting', '會議', '老師', '指導教授'])) {
    return [
      '先整理這次 Meeting 想問的 3 個問題',
      '把目前進度濃縮成一頁說明',
      '準備下一步要做的事情'
    ];
  }

  if (stage === 'topic' || containsAny(blocker, ['題目', '方向', '研究問題'])) {
    return [
      '先把研究題目縮到一句話',
      '列出 3 篇最相關的核心文獻',
      '安排一次明確的方向確認'
    ];
  }

  if (stage === 'writing' || containsAny(blocker, ['論文', '寫作', '段落'])) {
    return [
      '先完成摘要或章節大綱',
      '把本週寫作拆成 3 個小段',
      '確認哪一段最需要先修'
    ];
  }

  if (riskLevel === 'critical') {
    return [
      '先處理最卡住的那件事',
      '把本週進度拆成 3 步',
      '如果有需要，直接預約顧問'
    ];
  }

  return [
    '先完成今天最重要的一件事',
    '把本週進度排成簡單的順序',
    '開始使用一個最適合你的模板'
  ];
}

function buildResources(input: DiagnosisFormInput, riskLevel: DiagnosisResult['riskLevel']) {
  const resources: ResourceItem[] = [];

  if (riskLevel === 'critical' || containsAny(input.current_blocker, ['投稿', '論文', '寫作'])) {
    resources.push({
      label: '投稿策略模板',
      description: '先把投稿目標、格式與時程整理清楚。',
      href: '/resources/posting-template'
    });
  }

  if (containsAny(input.current_blocker, ['Meeting', '會議', '老師'])) {
    resources.push({
      label: 'Meeting 準備卡',
      description: '把問題、進度與下一步先整理成一頁。',
      href: '/resources/meeting-template'
    });
  }

  if (containsAny(input.current_blocker, ['題目', '文獻', '方向'])) {
    resources.push({
      label: '文獻與題目整理法',
      description: '先把研究方向縮小，再往下做。',
      href: '/resources/topic-template'
    });
  }

  resources.push({
    label: '免費畢業指南',
    description: '回顧你的研究狀態與下一步。',
    href: '/guides/graduation-guide'
  });

  return resources.slice(0, 3);
}

function buildTasks(input: DiagnosisFormInput, riskLevel: DiagnosisResult['riskLevel']) {
  const nextSteps = buildNextSteps(input, riskLevel);

  return {
    todayTasks: nextSteps.slice(0, 2),
    weeklyTasks: nextSteps
  };
}

export function buildDiagnosisResult(input: DiagnosisFormInput, leadId: string, accessToken: string, diagnosisId: string): DiagnosisResult {
  const normalizedInput = {
    ...input,
    current_blocker: normalizeText(input.current_blocker)
  };
  const riskScore = scoreRisk(normalizedInput);
  const riskLevel = getRiskLevel(riskScore);
  const nextSteps = buildNextSteps(normalizedInput, riskLevel);
  const resources = buildResources(normalizedInput, riskLevel);
  const tasks = buildTasks(normalizedInput, riskLevel);

  return {
    leadId,
    accessToken,
    diagnosisId,
    riskLevel,
    riskScore,
    stageLabel: STAGE_LABELS[normalizedInput.current_stage],
    blockerLabel: normalizedInput.current_blocker,
    summary: buildSummary(normalizedInput, riskLevel),
    nextSteps,
    resources,
    todayTasks: tasks.todayTasks,
    weeklyTasks: tasks.weeklyTasks,
    dashboardUrl: `/dashboard?token=${encodeURIComponent(accessToken)}`,
    welcomeMessage: `已完成診斷，接下來會根據你的狀況提供更適合的內容。`
  };
}

export function getDegreeLabel(value: DegreeType) {
  return DEGREE_LABELS[value];
}

export function getStageLabel(value: ResearchStage) {
  return STAGE_LABELS[value];
}

export function createLocalStorageSnapshot(input: DiagnosisFormInput, result: DiagnosisResult) {
  return {
    input,
    result,
    savedAt: new Date().toISOString()
  };
}
