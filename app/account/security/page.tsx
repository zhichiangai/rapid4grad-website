import { AccountSecurityForm } from "@/components/account/AccountSecurityForm";
import { requireActiveUser } from "@/lib/auth/authorization";

export default async function AccountSecurityPage() {
  const context = await requireActiveUser("/account/security");

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.28em] text-cyan-300">
          ACCOUNT SECURITY
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          帳號與安全
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          目前登入帳號：{context.user.email ?? "已登入帳號"}
        </p>
        <p className="mt-6 text-sm leading-6 text-slate-300">
          如果你原本使用 Google 登入，可以在這裡為同一個帳號建立 Email + 密碼登入方式。這不會建立新的 RAPID4GRAD 帳號，也不會改變你的工作區角色。
        </p>
        <div className="mt-8">
          <AccountSecurityForm />
        </div>
      </section>
    </main>
  );
}
