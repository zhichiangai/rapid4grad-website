"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProfessorSignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setPending(true);
    setError(null);

    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) {
      setError("登出失敗，請稍後再試。");
      setPending(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "登出中..." : "登出"}
      </button>
      {error ? <span role="alert" className="text-xs text-rose-200">{error}</span> : null}
    </div>
  );
}
