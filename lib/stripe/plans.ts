import type { SubscriptionPlanKey } from "@/types/database";

export type BillingPlan = {
  key: SubscriptionPlanKey;
  name: string;
  description: string;
  priceLabel: string;
  intervalLabel: string;
  stripePriceEnv: string;
  monthlyCreditLimit: number;
  pdfAuditLimit: number;
  audience: "student" | "professor";
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    key: "student_monthly",
    name: "學生月方案",
    description: "適合短期衝刺 Meeting、組會與論文初稿稽核。",
    priceLabel: "月付方案",
    intervalLabel: "每月更新 AI 額度",
    stripePriceEnv: "STRIPE_PRICE_STUDENT_MONTHLY",
    monthlyCreditLimit: 60,
    pdfAuditLimit: 6,
    audience: "student",
  },
  {
    key: "student_semester",
    name: "學生學期方案",
    description: "適合一整學期穩定使用 AI 稽核與研究進度管理。",
    priceLabel: "學期方案",
    intervalLabel: "每期更新 AI 額度",
    stripePriceEnv: "STRIPE_PRICE_STUDENT_SEMESTER",
    monthlyCreditLimit: 360,
    pdfAuditLimit: 36,
    audience: "student",
  },
  {
    key: "professor_lab",
    name: "教授實驗室方案",
    description: "適合教授管理 lab 學生研究狀態與稽核摘要。",
    priceLabel: "Lab 訂閱",
    intervalLabel: "依方案更新 lab 額度",
    stripePriceEnv: "STRIPE_PRICE_PROFESSOR_LAB",
    monthlyCreditLimit: 1200,
    pdfAuditLimit: 120,
    audience: "professor",
  },
];

export function getBillingPlan(planKey: string): BillingPlan | null {
  return BILLING_PLANS.find((plan) => plan.key === planKey) ?? null;
}
