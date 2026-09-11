"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getGoogleIdentity,
  getIdentityEmail,
  hasEmailIdentity,
} from "@/lib/auth/identities";

const GENERIC_UPDATE_ERROR = "無法更新密碼，請稍後再試。";
const GENERIC_LINK_ERROR = "目前無法綁定 Google，請改用其他 Google 帳號或稍後再試。";
const GENERIC_UNLINK_ERROR = "目前無法解除 Google 綁定，請確認 Email 密碼後再試。";
const PENDING_LINK_USER_ID = "rapid_pending_google_link_user";

type AccountSecurityFormProps = {
  accountEmail: string;
};

export function AccountSecurityForm({ accountEmail }: AccountSecurityFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unlinkPassword, setUnlinkPassword] = useState("");
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [showUnlink, setShowUnlink] = useState(false);
  const [isIdentityLoading, setIsIdentityLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const refreshIdentities = async () => {
    const supabase = createClient();
    const { data: identityData, error } = await supabase.auth.getUserIdentities();
    if (error) {
      console.warn("[auth/account-security] getUserIdentities failed", {
        operation: "getUserIdentities",
        status: 401,
        code: error.code ?? "unknown",
      });
      setGoogleEmail(null);
      setHasGoogle(false);
      return false;
    }

    const googleIdentity = getGoogleIdentity(identityData.identities);
    setGoogleEmail(getIdentityEmail(googleIdentity));
    setHasGoogle(Boolean(googleIdentity));
    return true;
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsIdentityLoading(true);
      const query = new URLSearchParams(window.location.search);
      const linked = query.get("link");
      if (linked === "success") {
        setSuccessMessage("Google 帳號已綁定。原本的 RAPID4GRAD 帳號與工作區維持不變。");
      } else if (linked === "error") {
        setErrorMessage(GENERIC_LINK_ERROR);
      }

      const result = await refreshIdentities();
      const pendingUserId = window.sessionStorage.getItem(PENDING_LINK_USER_ID);
      if (pendingUserId) {
        window.sessionStorage.removeItem(PENDING_LINK_USER_ID);
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user?.id !== pendingUserId) {
          setErrorMessage("驗證失敗：登入帳號未保持一致，Google 綁定未完成。");
        } else if (result) {
          setSuccessMessage("Google 帳號已綁定。原本的 RAPID4GRAD 帳號與工作區維持不變。");
        }
      }
      if (active) setIsIdentityLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

      if (password !== confirmPassword) {
      setErrorMessage("兩次輸入的密碼不一致。");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.warn("[auth/account-security] updateUser failed", {
          operation: "updateUser",
          status: 400,
          code: error.code ?? "unknown",
        });
        setErrorMessage(GENERIC_UPDATE_ERROR);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setSuccessMessage("密碼登入已建立。你現在可以登出後使用 Email + 密碼登入同一個帳號。");
    } catch {
      console.warn("[auth/account-security] updateUser request failed", {
        operation: "updateUser",
        status: 500,
        code: "unexpected_error",
      });
      setErrorMessage(GENERIC_UPDATE_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setErrorMessage(GENERIC_LINK_ERROR);
        return;
      }

      window.sessionStorage.setItem(PENDING_LINK_USER_ID, userData.user.id);
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("flow", "link");
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });

      if (error) {
        window.sessionStorage.removeItem(PENDING_LINK_USER_ID);
        console.warn("[auth/account-security] linkIdentity failed", {
          operation: "linkIdentity",
          status: 400,
          code: error.code ?? "unknown",
        });
        setErrorMessage(GENERIC_LINK_ERROR);
      }
    } catch {
      window.sessionStorage.removeItem(PENDING_LINK_USER_ID);
      console.warn("[auth/account-security] linkIdentity request failed", {
        operation: "linkIdentity",
        status: 500,
        code: "unexpected_error",
      });
      setErrorMessage(GENERIC_LINK_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkGoogle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);
    const originalPassword = unlinkPassword;
    setUnlinkPassword("");

    try {
      if (!accountEmail || !originalPassword) {
        setErrorMessage(GENERIC_UNLINK_ERROR);
        return;
      }

      const supabase = createClient();
      const { data: beforeUser, error: beforeUserError } = await supabase.auth.getUser();
      if (beforeUserError || !beforeUser.user) {
        setErrorMessage(GENERIC_UNLINK_ERROR);
        return;
      }

      const originalUserId = beforeUser.user.id;
      const { data: reauthData, error: reauthError } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: originalPassword,
      });
      if (reauthError || reauthData.user?.id !== originalUserId) {
        console.warn("[auth/account-security] unlink re-auth failed", {
          operation: "unlinkReauth",
          status: 401,
          code: reauthError?.code ?? (reauthData.user ? "identity_mismatch" : "unknown"),
        });
        setErrorMessage(GENERIC_UNLINK_ERROR);
        return;
      }

      const { data: identityData, error: identityError } = await supabase.auth.getUserIdentities();
      const googleIdentity = identityData?.identities
        ? getGoogleIdentity(identityData.identities)
        : null;
      if (identityError || !googleIdentity || !hasEmailIdentity(identityData?.identities)) {
        setErrorMessage("目前沒有其他可用登入方式，請先建立 Email 密碼。");
        return;
      }

      const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (unlinkError) {
        console.warn("[auth/account-security] unlinkIdentity failed", {
          operation: "unlinkIdentity",
          status: 400,
          code: unlinkError.code ?? "unknown",
        });
        setErrorMessage(GENERIC_UNLINK_ERROR);
        return;
      }

      const { data: afterUser, error: afterUserError } = await supabase.auth.getUser();
      const refreshSucceeded = await refreshIdentities();
      if (afterUserError || afterUser.user?.id !== originalUserId || !refreshSucceeded) {
        setErrorMessage("驗證失敗：帳號狀態未能安全確認，請聯絡管理員。");
        return;
      }
      setShowUnlink(false);
      setSuccessMessage("Google 帳號已解除綁定。之後請使用 Email + 密碼登入。");
    } catch {
      console.warn("[auth/account-security] unlinkIdentity request failed", {
        operation: "unlinkIdentity",
        status: 500,
        code: "unexpected_error",
      });
      setErrorMessage(GENERIC_UNLINK_ERROR);
    } finally {
      setUnlinkPassword("");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-4 border-t border-slate-800 pt-6">
        <div>
          <p className="text-lg font-semibold text-white">Email 密碼</p>
          <p className="mt-1 text-sm text-slate-400">設定或修改你的 Email 登入密碼。</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
          <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor="account-security-password"
        >
          新密碼
          </label>
          <input
          id="account-security-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          placeholder="至少 6 個字元"
          />
          </div>

          <div>
          <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor="account-security-confirm-password"
        >
          確認新密碼
          </label>
          <input
          id="account-security-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          placeholder="再次輸入新密碼"
          />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "儲存中..." : "儲存新密碼"}
          </button>
        </form>
      </section>

      <section className="space-y-4 border-t border-slate-800 pt-6">
        <div>
          <p className="text-lg font-semibold text-white">Google 帳號</p>
          <p className="mt-1 text-sm text-slate-400">
            {isIdentityLoading ? "讀取登入方式中..." : hasGoogle ? `已綁定${googleEmail ? `：${googleEmail}` : ""}` : "尚未綁定"}
          </p>
        </div>
        {!hasGoogle ? (
          <button
            type="button"
            onClick={handleLinkGoogle}
            disabled={isLoading || isIdentityLoading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-white transition hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            綁定 Google
          </button>
        ) : !showUnlink ? (
          <button
            type="button"
            onClick={() => setShowUnlink(true)}
            disabled={isLoading}
            className="w-full rounded-xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 font-semibold text-amber-100 transition hover:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            解除綁定 Google
          </button>
        ) : (
          <form className="space-y-4 rounded-2xl border border-amber-300/20 bg-amber-400/5 p-4" onSubmit={handleUnlinkGoogle}>
            <p className="text-sm leading-6 text-amber-100">解除 Google 前，請先輸入你的 RAPID Email 密碼，確認仍可使用 Email 登入。</p>
            <p className="text-sm text-slate-300">目前 Email：{accountEmail}</p>
            <label className="block text-sm font-medium text-slate-200" htmlFor="account-security-unlink-password">
              目前 Email 密碼
              <input
                id="account-security-unlink-password"
                name="unlinkPassword"
                type="password"
                autoComplete="current-password"
                required
                value={unlinkPassword}
                onChange={(event) => setUnlinkPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={isLoading} className="flex-1 rounded-xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? "確認中..." : "確認解除 Google"}</button>
              <button type="button" onClick={() => { setShowUnlink(false); setUnlinkPassword(""); }} disabled={isLoading} className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-white transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">取消</button>
            </div>
          </form>
        )}
      </section>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p
          role="status"
          className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100"
        >
          {successMessage}
        </p>
      ) : null}
    </div>
  );
}
