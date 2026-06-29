import Link from "next/link";

const adminCards = [
  {
    href: "/admin/leads",
    title: "Lead 名單管理",
    description: "查看問卷名單、風險分數、主要卡點標籤，並更新跟進狀態。",
  },
  {
    href: "/admin/quotas",
    title: "免費額度管理",
    description: "搜尋使用者 Email，手動解鎖或增加 AI 指令產生器免費額度。",
  },
  {
    href: "/admin/templates",
    title: "Prompt 模板 CMS",
    description: "維護不同 AI 模型與指令方向的角色、任務與輸出模板。",
  },
];

export default function AdminHomePage() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {adminCards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-blue-950/20 transition hover:border-blue-300/30 hover:bg-blue-500/10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
            Admin Module
          </p>
          <h2 className="mt-4 text-xl font-semibold text-white">
            {card.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {card.description}
          </p>
        </Link>
      ))}
    </section>
  );
}
