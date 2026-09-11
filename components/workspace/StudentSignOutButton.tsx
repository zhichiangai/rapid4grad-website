"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function StudentSignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setPending(true);
    setError(null);
    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) {
      setError("目前無法登出，請稍後再試。");
      setPending(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-60"
      >
        {pending ? "登出中..." : "登出"}
      </button>
      {error ? <span role="alert" className="sr-only">{error}</span> : null}
    </div>
  );
}
