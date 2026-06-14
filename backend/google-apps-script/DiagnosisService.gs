function handleDiagnosisSubmission_(data) {
  var input = normalizeDiagnosisInput_(data);
  var createdAt = new Date();
  var leadId = makeId_('lead');
  var accessToken = makeId_('token');
  var diagnosisId = makeId_('diag');
  var result = buildDiagnosisResult_(input, leadId, accessToken, diagnosisId);
  var dashboardUrl = buildAbsoluteSiteUrl_(result.dashboardUrl);

  var leadRecord = {
    created_at: createdAt,
    updated_at: createdAt,
    lead_id: leadId,
    access_token: accessToken,
    name: input.name,
    email: input.email,
    school: input.school,
    degree_type: input.degree_type,
    current_year: input.current_year,
    current_stage: input.current_stage,
    thesis_topic_status: input.thesis_topic_status,
    advisor_status: input.advisor_status,
    meeting_frequency: input.meeting_frequency,
    writing_progress: input.writing_progress,
    submission_status: input.submission_status,
    current_blocker: input.current_blocker,
    lead_source: input.lead_source,
    risk_level: result.riskLevel,
    risk_score: result.riskScore,
    status: 'diagnosed',
    last_diagnosis_id: diagnosisId,
    last_diagnosis_at: createdAt,
    dashboard_url: dashboardUrl,
    input_json: input,
    result_json: result,
    tags: buildLeadTags_(input, result),
    notes: '',
    email_status: 'pending'
  };

  var diagnosisRecord = {
    created_at: createdAt,
    diagnosis_id: diagnosisId,
    lead_id: leadId,
    lead_name: input.name,
    lead_email: input.email,
    risk_level: result.riskLevel,
    risk_score: result.riskScore,
    stage_label: result.stageLabel,
    blocker_label: result.blockerLabel,
    summary: result.summary,
    next_steps_json: result.nextSteps,
    resources_json: result.resources,
    today_tasks_json: result.todayTasks,
    weekly_tasks_json: result.weeklyTasks,
    input_json: input,
    result_json: result
  };

  var riskAssessmentRecord = {
    created_at: createdAt,
    assessment_id: makeId_('risk'),
    lead_id: leadId,
    diagnosis_id: diagnosisId,
    risk_score: result.riskScore,
    risk_level: result.riskLevel,
    top_factors_json: buildRiskFactors_(input),
    recommended_action: result.nextSteps[0] || '',
    notes: result.summary
  };

  appendRecord_(SHEET_NAMES.leads, LEADS_HEADERS, leadRecord);
  appendRecord_(SHEET_NAMES.diagnoses, DIAGNOSES_HEADERS, diagnosisRecord);
  appendTaskRecords_(leadId, diagnosisId, input, result);
  appendRecord_(SHEET_NAMES.riskAssessments, RISK_HEADERS, riskAssessmentRecord);

  var emailStatus = sendDiagnosisEmails_(leadRecord, result);
  updateLeadRecord_(leadId, {
    updated_at: new Date(),
    email_status: emailStatus,
    status: 'active'
  });

  return {
    lead: toClientLead_(leadRecord),
    input: input,
    result: result,
    savedAt: createdAt
  };
}

function normalizeDiagnosisInput_(data) {
  var input = {
    name: sanitizeText_(data.name, 120),
    email: sanitizeEmail_(data.email),
    school: sanitizeText_(data.school, 120),
    degree_type: normalizeEnum_(data.degree_type, ['master', 'phd', 'pre_grad', 'other'], 'master'),
    current_year: sanitizeText_(data.current_year, 60),
    current_stage: normalizeEnum_(data.current_stage, ['topic', 'literature', 'proposal', 'meeting', 'writing', 'submission', 'defense'], 'writing'),
    thesis_topic_status: normalizeEnum_(data.thesis_topic_status, ['none', 'vague', 'clear'], 'vague'),
    advisor_status: normalizeEnum_(data.advisor_status, ['none', 'seeking', 'stable'], 'seeking'),
    meeting_frequency: normalizeEnum_(data.meeting_frequency, ['weekly', 'biweekly', 'monthly', 'rare'], 'biweekly'),
    writing_progress: normalizeEnum_(data.writing_progress, ['0-25', '26-50', '51-75', '76-100'], '26-50'),
    submission_status: normalizeEnum_(data.submission_status, ['not_started', 'preparing', 'submitted'], 'not_started'),
    current_blocker: sanitizeText_(data.current_blocker, 1000),
    lead_source: sanitizeText_(data.lead_source, 120) || CONFIG.DEFAULT_LEAD_SOURCE
  };

  if (!input.name) {
    throw new Error('Name is required');
  }

  if (!input.email) {
    throw new Error('Email is required');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error('Invalid email');
  }

  if (!input.current_blocker) {
    throw new Error('Current blocker is required');
  }

  return input;
}

function normalizeEnum_(value, allowedValues, fallback) {
  var normalized = String(value || '').trim();
  for (var i = 0; i < allowedValues.length; i += 1) {
    if (allowedValues[i] === normalized) {
      return normalized;
    }
  }
  return fallback;
}

function getDegreeLabel_(value) {
  var labels = {
    master: '碩士生',
    phd: '博士生',
    pre_grad: '準研究生',
    other: '研究生'
  };
  return labels[value] || '研究生';
}

function getStageLabel_(value) {
  var labels = {
    topic: '題目 / 開題前',
    literature: '文獻閱讀中',
    proposal: 'proposal / 計畫中',
    meeting: 'Meeting 追進度',
    writing: '論文撰寫中',
    submission: '投稿準備中',
    defense: '口試 / 畢業前'
  };
  return labels[value] || '研究階段未填';
}

function scoreRisk_(input) {
  var score = 0;

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

  if (containsAny_(input.current_blocker, ['延畢', '投稿', '卡住', '不知道', '沒進度'])) {
    score += 10;
  }

  return Math.min(score, 100);
}

function getRiskLevel_(score) {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function containsAny_(source, keywords) {
  var text = String(source || '');
  for (var i = 0; i < keywords.length; i += 1) {
    if (text.indexOf(keywords[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function buildSummary_(input, riskLevel) {
  var degree = getDegreeLabel_(input.degree_type);
  var stage = getStageLabel_(input.current_stage);
  var blocker = input.current_blocker;

  if (riskLevel === 'critical') {
    return degree + '目前在' + stage + '，主要卡點是「' + blocker + '」。現在先把題目、Meeting 與寫作順序重新排好。';
  }

  if (riskLevel === 'high') {
    return degree + '目前在' + stage + '，主要問題是「' + blocker + '」。你已接近需要加速的階段，先把下一步做清楚會最有效。';
  }

  if (riskLevel === 'medium') {
    return degree + '目前在' + stage + '，還有一些明顯卡點需要處理。只要先把順序排好，進度就能穩定推進。';
  }

  return degree + '目前在' + stage + '，整體狀態相對穩定。你現在適合把節奏維持住，避免小問題累積成大卡關。';
}

function buildNextSteps_(input, riskLevel) {
  var blocker = input.current_blocker;
  var stage = input.current_stage;

  if (containsAny_(blocker, ['投稿'])) {
    return [
      '先把目標期刊縮小到 2 到 3 個',
      '整理目前論文缺口與格式要求',
      '先完成投稿前 check list'
    ];
  }

  if (containsAny_(blocker, ['Meeting', '會議', '老師', '指導教授'])) {
    return [
      '先整理這次 Meeting 想問的 3 個問題',
      '把目前進度濃縮成一頁說明',
      '準備下一步要做的事情'
    ];
  }

  if (stage === 'topic' || containsAny_(blocker, ['題目', '方向', '研究問題'])) {
    return [
      '先把研究題目縮到一句話',
      '列出 3 篇最相關的核心文獻',
      '安排一次明確的方向確認'
    ];
  }

  if (stage === 'writing' || containsAny_(blocker, ['論文', '寫作', '段落'])) {
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

function buildResources_(input, riskLevel) {
  var resources = [];

  if (riskLevel === 'critical' || containsAny_(input.current_blocker, ['投稿', '論文', '寫作'])) {
    resources.push({
      label: '投稿策略模板',
      description: '先把投稿目標、格式與時程整理清楚。',
      href: '/resources/posting-template'
    });
  }

  if (containsAny_(input.current_blocker, ['Meeting', '會議', '老師'])) {
    resources.push({
      label: 'Meeting 準備卡',
      description: '把問題、進度與下一步先整理成一頁。',
      href: '/resources/meeting-template'
    });
  }

  if (containsAny_(input.current_blocker, ['題目', '文獻', '方向'])) {
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

function buildTasks_(input, riskLevel) {
  var nextSteps = buildNextSteps_(input, riskLevel);

  return {
    todayTasks: nextSteps.slice(0, 2),
    weeklyTasks: nextSteps
  };
}

function buildRiskFactors_(input) {
  var factors = [];
  if (input.thesis_topic_status === 'none' || input.thesis_topic_status === 'vague') {
    factors.push('題目未完全收斂');
  }
  if (input.advisor_status !== 'stable') {
    factors.push('指導關係尚未穩定');
  }
  if (input.meeting_frequency === 'rare' || input.meeting_frequency === 'monthly') {
    factors.push('Meeting 節奏偏慢');
  }
  if (input.writing_progress === '0-25' || input.writing_progress === '26-50') {
    factors.push('寫作進度偏早期');
  }
  if (input.submission_status === 'not_started') {
    factors.push('投稿尚未展開');
  }
  if (factors.length === 0) {
    factors.push('目前沒有明顯高風險因子');
  }
  return factors;
}

function buildLeadTags_(input, result) {
  var tags = ['diagnosis_submitted', result.riskLevel];
  if (input.degree_type) {
    tags.push(input.degree_type);
  }
  if (input.current_stage) {
    tags.push(input.current_stage);
  }
  return tags.join(',');
}

function buildDiagnosisResult_(input, leadId, accessToken, diagnosisId) {
  var riskScore = scoreRisk_(input);
  var riskLevel = getRiskLevel_(riskScore);
  var nextSteps = buildNextSteps_(input, riskLevel);
  var resources = buildResources_(input, riskLevel);
  var tasks = buildTasks_(input, riskLevel);
  var dashboardUrl = '/dashboard?token=' + encodeURIComponent(accessToken);

  return {
    leadId: leadId,
    accessToken: accessToken,
    diagnosisId: diagnosisId,
    riskLevel: riskLevel,
    riskScore: riskScore,
    stageLabel: getStageLabel_(input.current_stage),
    blockerLabel: input.current_blocker,
    summary: buildSummary_(input, riskLevel),
    nextSteps: nextSteps,
    resources: resources,
    todayTasks: tasks.todayTasks,
    weeklyTasks: tasks.weeklyTasks,
    dashboardUrl: dashboardUrl,
    welcomeMessage: '已完成診斷，接下來會根據你的狀況提供更適合的內容。'
  };
}

function buildAbsoluteSiteUrl_(pathname) {
  return CONFIG.SITE_URL.replace(/\/$/, '') + pathname;
}

function appendTaskRecords_(leadId, diagnosisId, input, result) {
  var now = new Date();
  var allTasks = [];

  for (var i = 0; i < result.todayTasks.length; i += 1) {
    allTasks.push({
      created_at: now,
      task_id: makeId_('task'),
      lead_id: leadId,
      diagnosis_id: diagnosisId,
      scope: 'today',
      task_order: i + 1,
      task_title: result.todayTasks[i],
      task_status: 'open',
      source_stage: input.current_stage,
      due_hint: 'today',
      assigned_to: input.name
    });
  }

  for (var j = 0; j < result.weeklyTasks.length; j += 1) {
    allTasks.push({
      created_at: now,
      task_id: makeId_('task'),
      lead_id: leadId,
      diagnosis_id: diagnosisId,
      scope: 'week',
      task_order: j + 1,
      task_title: result.weeklyTasks[j],
      task_status: 'open',
      source_stage: input.current_stage,
      due_hint: 'this week',
      assigned_to: input.name
    });
  }

  for (var k = 0; k < allTasks.length; k += 1) {
    appendRecord_(SHEET_NAMES.tasks, TASK_HEADERS, allTasks[k]);
  }
}

function toClientLead_(lead) {
  return {
    leadId: lead.lead_id,
    accessToken: lead.access_token,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
    name: lead.name,
    email: lead.email,
    school: lead.school,
    degree_type: lead.degree_type,
    current_year: lead.current_year,
    current_stage: lead.current_stage,
    thesis_topic_status: lead.thesis_topic_status,
    advisor_status: lead.advisor_status,
    meeting_frequency: lead.meeting_frequency,
    writing_progress: lead.writing_progress,
    submission_status: lead.submission_status,
    current_blocker: lead.current_blocker,
    lead_source: lead.lead_source,
    risk_level: lead.risk_level,
    risk_score: lead.risk_score,
    status: lead.status,
    dashboard_url: lead.dashboard_url,
    dashboardUrl: lead.dashboard_url,
    last_diagnosis_id: lead.last_diagnosis_id,
    last_diagnosis_at: lead.last_diagnosis_at,
    email_status: lead.email_status,
    tags: lead.tags
  };
}
