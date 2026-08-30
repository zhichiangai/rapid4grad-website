import type { Database } from "@/types/database-v2.generated";

export type WeeklyUpdate = Database["public"]["Tables"]["weekly_updates"]["Row"];
export type WeeklyStatus = "on_track" | "slightly_behind" | "blocked";
export type WeeklyHelp = "none" | "next_meeting" | "soon";

export const weeklyStatuses: Array<{ value: WeeklyStatus; label: string; description: string }> = [
  { value: "on_track", label: "進度正常", description: "目前研究節奏大致符合預期。" },
  { value: "slightly_behind", label: "稍微落後", description: "有些事情延遲，但目前還能追回來。" },
  { value: "blocked", label: "目前卡住", description: "核心問題沒有解決，已明顯影響下一步。" },
];

export const weeklyHelpOptions: Array<{ value: WeeklyHelp; label: string; description: string }> = [
  { value: "none", label: "暫時不需要", description: "我可以先自己繼續處理。" },
  { value: "next_meeting", label: "下次 Meeting 討論", description: "希望下次見面時一起確認。" },
  { value: "soon", label: "希望近期協助", description: "這個問題可能不適合等到下次 Meeting。" },
];

export function isFunctionalSubscription(subscription: {
  status: string;
  current_period_start: string;
  current_period_end: string;
  grace_ends_at: string | null;
} | null) {
  if (!subscription) return false;
  const now = Date.now();
  if (["active", "trialing"].includes(subscription.status)) {
    return new Date(subscription.current_period_start).getTime() <= now && new Date(subscription.current_period_end).getTime() > now;
  }
  return subscription.status === "past_due" && Boolean(subscription.grace_ends_at) && new Date(subscription.grace_ends_at as string).getTime() > now;
}
