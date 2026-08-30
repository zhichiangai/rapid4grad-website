const TAIPEI_TIME_ZONE = "Asia/Taipei";

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function isoDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

export function getTaipeiDate(date = new Date()) {
  const parts = dateParts(date);
  return isoDate(parts.year, parts.month, parts.day);
}

export function getTaipeiMonday(date = new Date()) {
  const parts = dateParts(date);
  const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - daysFromMonday));
  return monday.toISOString().slice(0, 10);
}

export function formatWeekRange(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const formatter = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatTaipeiDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TAIPEI_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
