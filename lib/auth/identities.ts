import type { UserIdentity } from "@supabase/supabase-js";

export function getGoogleIdentity(
  identities: readonly UserIdentity[] | null | undefined,
) {
  return identities?.find((identity) => identity.provider === "google") ?? null;
}

export function getIdentityEmail(identity: UserIdentity | null) {
  if (!identity) return null;

  const email = identity.identity_data?.email;
  return typeof email === "string" && email.includes("@") ? email : null;
}

export function hasEmailIdentity(
  identities: readonly UserIdentity[] | null | undefined,
) {
  return identities?.some((identity) => identity.provider === "email") ?? false;
}
