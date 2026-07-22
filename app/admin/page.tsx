import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/authorization";

const adminCards = [
  {
    href: "/admin/users",
    eyebrow: "Identity",
    title: "帳號與角色",
    description: "查詢使用者、修正 student／professor role，以及停用或恢復帳號。",
  },
  {
    href: "/admin/entitlements",
    eyebrow: "Access",
    title: "完整課程權限",
    description: "受控補發或撤銷永久 course_full entitlement。",
  },
  {
    href: "/admin/labs",
    eyebrow: "Observation",
    title: "Lab 營運觀察",
    description: "查看所有 Lab、成員席位、方案及 Professor workspace 唯讀入口。",
  },
  {
    href: "/admin/subscriptions",
    eyebrow: "Billing",
    title: "Professor 訂閱",
    description: "檢查訂閱同步狀態，並提供最多 30 天的受控客服延長。",
  },
  {
    href: "/admin/orders",
    eyebrow: "Payments",
    title: "訂單與付款",
    description: "查看安全的訂單、付款狀態與 provider 同步資訊，不顯示 raw payload。",
  },
  {
    href: "/admin/pdf-credits",
    eyebrow: "AI Operations",
    title: "Lab PDF 額度",
    description: "查看 shared pool，並只增加當期 limit，不直接修改 used／reserved。",
  },
  {
    href: "/admin/action-logs",
    eyebrow: "Audit",
    title: "管理操作紀錄",
    description: "查看每一筆高權限操作的原因與安全 before／after snapshot。",
  },
  {
    href: "/admin/leads",
    eyebrow: "Legacy Funnel",
    title: "Lead 名單管理",
    description: "保留 Phase 1 問卷名單、風險與跟進狀態管理。",
  },
  {
    href: "/admin/quotas",
    eyebrow: "Legacy Prompt",
    title: "免費額度管理",
    description: "保留 Phase 1 Prompt Builder 免費額度解鎖。",
  },
  {
    href: "/admin/templates",
    eyebrow: "Prompt CMS",
    title: "Prompt 模板",
    description: "維護共用 AI 指令模板；不顯示任何學生實際 prompt。",
  },
];

export default async function AdminHomePage() {
  await requireAdminContext("/admin");

  return (
    <section>
      <div className="rounded-[2rem] border border-cyan-300/15 bg-cyan-400/[0.05] p-5 text-sm leading-6 text-cyan-50">
        Admin 是內部營運控制台。所有高權限異動都會再次驗證身分、要求操作原因，並寫入不可由一般 Client 修改的 action log。
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-blue-950/20 transition hover:border-blue-300/30 hover:bg-blue-500/10"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
              {card.eyebrow}
            </p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              {card.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
