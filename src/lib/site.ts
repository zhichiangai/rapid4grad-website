export const SITE_NAME = 'RAPID4GRAD';
export const SITE_TAGLINE = '研究生畢業導航系統';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rapid4grad.com';
export const APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwYsgYu5FmHLuT8ZunSupicMeyz1Ojwq6lRJvFKwzhbxj7XNWIbFI-V1x3wWMsRZnMV/exec';

export const DIAGNOSIS_STORAGE_KEY = 'rapid4grad:last_diagnosis';

export function siteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}
