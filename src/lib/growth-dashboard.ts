export const ADMIN_SESSION_KEY = 'rapid4grad_admin_session';

export const adminNavItems = [
  { href: '/admin/dashboard', label: '總覽' },
  { href: '/admin/funnels', label: '漏斗分析' },
  { href: '/admin/leads', label: '名單總覽' },
  { href: '/admin/insights', label: '產品洞察' },
  { href: '/admin/content', label: '內容分析' }
] as const;

export const overviewKpis = [
  { label: '今日訪客', value: '1,284', delta: '+12%', note: '比昨天更穩' },
  { label: '本週診斷', value: '312', delta: '+18%', note: '診斷開始數上升' },
  { label: '本月診斷', value: '1,047', delta: '+9%', note: '回訪持續增加' },
  { label: '累積名單', value: '6,421', delta: '+146', note: '持續累積中' }
] as const;

export const funnelStages = [
  { name: 'Homepage', value: 1000, rate: '100%', dropoff: '0%' },
  { name: 'Diagnosis Start', value: 300, rate: '30%', dropoff: '70%' },
  { name: 'Diagnosis Submit', value: 220, rate: '22%', dropoff: '26.7%' },
  { name: 'Diagnosis Complete', value: 180, rate: '18%', dropoff: '18.2%' },
  { name: 'Result View', value: 170, rate: '17%', dropoff: '5.6%' }
] as const;

export const eventHighlights = [
  { event: 'homepage_view', count: 1284, note: '首頁是最大入口' },
  { event: 'diagnosis_start', count: 300, note: '開始診斷的人數' },
  { event: 'diagnosis_complete', count: 180, note: '最接近價值的人' },
  { event: 'result_view', count: 170, note: '真正拿到結果的人' }
] as const;

export const leadRows = [
  {
    name: '萬豐',
    email: 'wanfeng@example.com',
    school: '台科大',
    department: '資管所',
    degree: '碩士',
    grade: '碩二',
    riskLevel: '中風險',
    primaryRisk: 'Meeting 不固定',
    diagnosisDate: '2026-06-15'
  },
  {
    name: '子晴',
    email: 'ziqing@example.com',
    school: '成大',
    department: '材料所',
    degree: '博士',
    grade: '博三',
    riskLevel: '高風險',
    primaryRisk: '論文寫作停住',
    diagnosisDate: '2026-06-14'
  },
  {
    name: '承恩',
    email: 'chengen@example.com',
    school: '台大',
    department: '電機所',
    degree: '碩士',
    grade: '碩一',
    riskLevel: '低風險',
    primaryRisk: '題目仍在收斂',
    diagnosisDate: '2026-06-14'
  },
  {
    name: '品妤',
    email: 'pinyu@example.com',
    school: '政大',
    department: '中文所',
    degree: '博士',
    grade: '博二',
    riskLevel: '中風險',
    primaryRisk: '投稿節奏不穩',
    diagnosisDate: '2026-06-13'
  },
  {
    name: '昱廷',
    email: 'yuting@example.com',
    school: '中山',
    department: '管理學院',
    degree: '碩士',
    grade: '碩三',
    riskLevel: '高風險',
    primaryRisk: '長期未 Meeting',
    diagnosisDate: '2026-06-12'
  }
] as const;

export const insightBlocks = [
  {
    title: '最常出現的風險',
    value: '論文寫作 42%',
    desc: '寫作卡住仍是最大痛點'
  },
  {
    title: '第二大風險',
    value: 'Meeting 31%',
    desc: '固定節奏不足'
  },
  {
    title: '第三大風險',
    value: '投稿 17%',
    desc: '接近畢業的人開始焦慮'
  },
  {
    title: '第四大風險',
    value: '研究方向 10%',
    desc: '題目收斂仍是入口問題'
  }
] as const;

export const segmentComparison = [
  {
    label: '碩士生',
    metrics: ['主要卡點：Meeting', '最常需求：今天先做什麼', '流失點：診斷未完成']
  },
  {
    label: '博士生',
    metrics: ['主要卡點：寫作 / 投稿', '最常需求：進度整理', '流失點：看完結果沒回來']
  }
] as const;

export const contentAnalytics = [
  { page: '首頁', diagnosis: '42%', complete: '18%', highest: '首頁 Hero' },
  { page: '學生區', diagnosis: '33%', complete: '21%', highest: '開始診斷 CTA' },
  { page: '卡關情境', diagnosis: '27%', complete: '17%', highest: '情境卡片' },
  { page: '免費診斷', diagnosis: '61%', complete: '44%', highest: '表單區塊' },
  { page: '結果頁', diagnosis: '89%', complete: '72%', highest: '今天先做卡片' }
] as const;

export const adminSummaryNotes = [
  '目前最需要盯的是診斷開始到提交之間的流失。',
  '高風險名單通常會集中在 Meeting 不固定、寫作停住的人。',
  '內容面最有效的入口仍然是免費診斷與學生區。'
] as const;
