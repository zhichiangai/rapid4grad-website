-- RAPID4GRAD Professor Dashboard Demo Seed
-- Phase 1 uses frontend mock data for /professor.
-- This optional seed is documentation-friendly and does not create permanent tables.
-- It is safe to run because the temp table is dropped at transaction end.

BEGIN;

CREATE TEMP TABLE professor_demo_students (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  degree_year TEXT NOT NULL,
  research_stage TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  pain_points TEXT[] NOT NULL,
  last_updated_at TEXT NOT NULL,
  next_step TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO professor_demo_students
  (id, student_name, degree_year, research_stage, risk_level, pain_points, last_updated_at, next_step)
VALUES
  ('demo-ming', '碩二小明', 'M2 碩二', '組會簡報衝刺', 'high', ARRAY['簡報失焦', '研究價值不清', '教授追問壓力'], '2026-06-24 21:10', '重排簡報故事線，先補研究貢獻頁'),
  ('demo-hua', '碩一小華', 'M1 碩一', '文獻與題目探索', 'low', ARRAY['文獻整理', '題目收斂'], '2026-06-23 18:35', '把 12 篇文獻整理成 3 個可能 gap'),
  ('demo-yichun', '博三怡君', 'PhD 3', '投稿前 manuscript 修訂', 'medium', ARRAY['投稿邏輯', 'limitation', '貢獻 framing'], '2026-06-22 15:50', '補強 limitation 與 contribution paragraph'),
  ('demo-che', '碩三阿哲', 'M3+ 碩三以上', '題目重整與畢業路線確認', 'high', ARRAY['題目不穩', 'Meeting 壓力', '畢業路線不明'], '2026-06-21 23:20', '先定義最低可畢業版本，不再擴題'),
  ('demo-an', '在職專班小安', 'Part-time 在職專班', '工具流與每週產出節奏建立', 'medium', ARRAY['時間分配', '工具落差', '寫作節奏'], '2026-06-20 20:05', '建立每週 2 小時固定研究輸出節奏');

SELECT * FROM professor_demo_students;

COMMIT;
