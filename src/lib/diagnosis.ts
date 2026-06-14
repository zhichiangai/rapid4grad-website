export type DegreeType = 'master' | 'phd';
export type ResearchStage = 'topic' | 'proposal' | 'writing' | 'submission';
export type ThesisTopicStatus = 'none' | 'clear';
export type AdvisorStatus = 'none' | 'stable';
export type MeetingFrequency = 'weekly' | 'biweekly' | 'monthly' | 'rare';
export type WritingProgress = '0-25' | '26-50' | '51-75' | '76-100';
export type SubmissionStatus = 'not_started' | 'preparing' | 'submitted';

export type DiagnosisFormInput = {
  name: string;
  email: string;
  school: string;
  department: string;
  degree_type: DegreeType;
  current_year: string;
  has_topic: 'yes' | 'no';
  fixed_meeting: 'yes' | 'no';
  writing_started: 'yes' | 'no';
  submission_pressure: 'none' | 'some' | 'urgent';
  current_blocker: string;
  lead_source: string;
  current_stage: ResearchStage;
  thesis_topic_status: ThesisTopicStatus;
  advisor_status: AdvisorStatus;
  meeting_frequency: MeetingFrequency;
  writing_progress: WritingProgress;
  submission_status: SubmissionStatus;
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
  riskLevel: 'low' | 'medium' | 'high';
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
  biggestRisk: string;
};

const DEGREE_LABELS: Record<DegreeType, string> = {
  master: '碩士生',
  phd: '博士生'
};

const STAGE_LABELS: Record<ResearchStage, string> = {
  topic: '題目未定',
  proposal: '計畫與開題',
  writing: '論文撰寫中',
  submission: '投稿準備中'
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function containsAny(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

function deriveCurrentStage(input: DiagnosisFormInput): ResearchStage {
  if (input.has_topic === 'no') return 'topic';
  if (input.writing_started === 'no') return 'proposal';
  if (input.submission_pressure !== 'none') return 'submission';
  return 'writing';
}

function deriveWritingProgress(input: DiagnosisFormInput): WritingProgress {
  if (input.writing_started === 'no') return '0-25';
  if (input.submission_pressure === 'urgent') return '76-100';
  if (input.submission_pressure === 'some') return '51-75';
  return '26-50';
}

function deriveSubmissionStatus(input: DiagnosisFormInput): SubmissionStatus {
  if (input.submission_pressure === 'urgent') return 'preparing';
  if (input.submission_pressure === 'some') return 'preparing';
  return 'not_started';
}

function deriveMeetingFrequency(input: DiagnosisFormInput): MeetingFrequency {
  return input.fixed_meeting === 'yes' ? 'biweekly' : 'rare';
}

function getRiskLevel(score: number): DiagnosisResult['riskLevel'] {
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function scoreRisk(input: DiagnosisFormInput) {
  let score = 0;
  const blocker = normalizeText(input.current_blocker);

  if (input.has_topic === 'no') score += 20;
  if (input.fixed_meeting === 'no') score += 15;
  if (input.writing_started === 'no') score += 15;
  if (input.submission_pressure === 'some') score += 10;
  if (input.submission_pressure === 'urgent') score += 18;

  if (containsAny(blocker, ['延畢', '投稿', '卡住', '不知道', '沒進度', '來不及'])) {
    score += 10;
  }

  return Math.min(score, 100);
}

function buildBiggestRisk(input: DiagnosisFormInput) {
  if (input.has_topic === 'no') return '題目還沒有定下來';
  if (input.fixed_meeting === 'no') return 'Meeting 節奏不固定';
  if (input.writing_started === 'no') return '論文還沒有真正開始寫';
  if (input.submission_pressure === 'urgent') return '投稿壓力已經很高';
  if (input.submission_pressure === 'some') return '投稿節奏需要先排好';
  return '目前最大問題需要再收斂';
}

function buildSummary(input: DiagnosisFormInput, riskLevel: DiagnosisResult['riskLevel'], biggestRisk: string) {
  const degree = DEGREE_LABELS[input.degree_type];
  const blocker = normalizeText(input.current_blocker);

  if (riskLevel === 'high') {
    return `${degree}目前屬於高風險狀態，主要卡點是「${biggestRisk}」。現在先把題目、Meeting 與寫作順序重新排好。`;
  }

  if (riskLevel === 'medium') {
    return `${degree}目前有一些需要先處理的卡點，最明顯的是「${biggestRisk}」。只要先把下一步排清楚，進度就能回到正軌。`;
  }

  return `${degree}目前整體狀態還算穩定，重點是把「${blocker}」拆成清楚的下一步，避免小問題累積成大卡關。`;
}

function buildNextSteps(input: DiagnosisFormInput, riskLevel: DiagnosisResult['riskLevel']) {
  if (input.has_topic === 'no') {
    return [
      '先把研究題目縮成一句話',
      '列出 3 個相關關鍵字或核心文獻',
      '安排一次題目確認'
    ];
  }

  if (input.fixed_meeting === 'no') {
    return [
      '先確認下一次 Meeting 時間',
      '把目前進度整理成一頁',
      '準備 3 個要問教授的問題'
    ];
  }

  if (input.writing_started === 'no') {
    return [
      '先完成章節大綱',
      '把文獻整理成 3 個主題',
      '排出本週寫作時間'
    ];
  }

  if (input.submission_pressure !== 'none') {
    return [
      '列出目前投稿目標',
      '整理格式與內容缺口',
      '完成投稿前 checklist'
    ];
  }

  if (riskLevel === 'medium' || riskLevel === 'high') {
    return [
      '先處理最卡住的那件事',
      '把本週進度拆成 3 步',
      '把下次 Meeting 要問的問題列出來'
    ];
  }

  return [
    '先完成今天最重要的一件事',
    '把本週進度排成簡單順序',
    '開始使用一個最適合你的模板'
  ];
}

function buildResources(input: DiagnosisFormInput) {
  const resources: ResourceItem[] = [];

  if (input.has_topic === 'no') {
    resources.push({
      label: '題目整理卡',
      description: '先把研究方向縮小，再往下做。',
      href: '/guides/topic-template'
    });
  }

  if (input.fixed_meeting === 'no') {
    resources.push({
      label: 'Meeting 準備卡',
      description: '把問題、進度與下一步先整理成一頁。',
      href: '/guides/meeting-template'
    });
  }

  if (input.writing_started === 'yes' || input.submission_pressure !== 'none') {
    resources.push({
      label: '寫作與投稿模板',
      description: '先把章節、投稿目標與格式缺口整理清楚。',
      href: '/guides/writing-template'
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
  const normalizedInput: DiagnosisFormInput = {
    ...input,
    current_blocker: normalizeText(input.current_blocker),
    current_stage: deriveCurrentStage(input),
    thesis_topic_status: (input.has_topic === 'yes' ? 'clear' : 'none') as ThesisTopicStatus,
    advisor_status: (input.fixed_meeting === 'yes' ? 'stable' : 'none') as AdvisorStatus,
    meeting_frequency: deriveMeetingFrequency(input),
    writing_progress: deriveWritingProgress(input),
    submission_status: deriveSubmissionStatus(input)
  };
  const riskScore = scoreRisk(normalizedInput);
  const riskLevel = getRiskLevel(riskScore);
  const biggestRisk = buildBiggestRisk(normalizedInput);
  const nextSteps = buildNextSteps(normalizedInput, riskLevel);
  const resources = buildResources(normalizedInput);
  const tasks = buildTasks(normalizedInput, riskLevel);

  return {
    leadId,
    accessToken,
    diagnosisId,
    riskLevel,
    riskScore,
    stageLabel: STAGE_LABELS[normalizedInput.current_stage],
    blockerLabel: normalizedInput.current_blocker,
    summary: buildSummary(normalizedInput, riskLevel, biggestRisk),
    nextSteps,
    resources,
    todayTasks: tasks.todayTasks,
    weeklyTasks: tasks.weeklyTasks,
    dashboardUrl: '/dashboard',
    welcomeMessage: '已完成診斷，接下來會根據你的狀況提供更適合的內容。',
    biggestRisk
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
