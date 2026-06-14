const CONFIG = {
  SHEET_ID: '1eI3rOuEhEn--VdA8luYUbfkxwBaF5NO1E0hynGgOBvk',
  SITE_URL: 'https://rapid4grad.com',
  APP_NAME: 'RAPID4GRAD',
  DEFAULT_LEAD_SOURCE: 'rapid4grad_website',
  WELCOME_EMAIL_SUBJECT: 'RAPID4GRAD｜你的診斷已建立',
  RESULT_EMAIL_SUBJECT: 'RAPID4GRAD｜你的結果摘要與下一步'
};

const SHEET_NAMES = {
  leads: 'leads',
  diagnoses: 'diagnoses',
  tasks: 'tasks',
  emails: 'emails',
  riskAssessments: 'risk_assessments'
};

const LEADS_HEADERS = [
  'created_at',
  'updated_at',
  'lead_id',
  'access_token',
  'name',
  'email',
  'school',
  'degree_type',
  'current_year',
  'current_stage',
  'thesis_topic_status',
  'advisor_status',
  'meeting_frequency',
  'writing_progress',
  'submission_status',
  'current_blocker',
  'lead_source',
  'risk_level',
  'risk_score',
  'status',
  'last_diagnosis_id',
  'last_diagnosis_at',
  'dashboard_url',
  'input_json',
  'result_json',
  'tags',
  'notes',
  'email_status'
];

const DIAGNOSES_HEADERS = [
  'created_at',
  'diagnosis_id',
  'lead_id',
  'lead_name',
  'lead_email',
  'risk_level',
  'risk_score',
  'stage_label',
  'blocker_label',
  'summary',
  'next_steps_json',
  'resources_json',
  'today_tasks_json',
  'weekly_tasks_json',
  'input_json',
  'result_json'
];

const TASK_HEADERS = [
  'created_at',
  'task_id',
  'lead_id',
  'diagnosis_id',
  'scope',
  'task_order',
  'task_title',
  'task_status',
  'source_stage',
  'due_hint',
  'assigned_to'
];

const EMAIL_HEADERS = [
  'created_at',
  'email_id',
  'lead_id',
  'diagnosis_id',
  'email_type',
  'to_email',
  'subject',
  'status',
  'error_message'
];

const RISK_HEADERS = [
  'created_at',
  'assessment_id',
  'lead_id',
  'diagnosis_id',
  'risk_score',
  'risk_level',
  'top_factors_json',
  'recommended_action',
  'notes'
];
