const TAIPEI_TIME_ZONE = "Asia/Taipei";

function partsToRecord(parts: Intl.DateTimeFormatPart[]) {
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

export function parseTaipeiDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const naiveUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const localParts = partsToRecord(formatter.formatToParts(new Date(naiveUtc)));
  const displayedAsUtc = Date.UTC(
    Number(localParts.year),
    Number(localParts.month) - 1,
    Number(localParts.day),
    Number(localParts.hour),
    Number(localParts.minute),
  );
  const result = new Date(naiveUtc - (displayedAsUtc - naiveUtc));
  return Number.isNaN(result.getTime()) ? null : result;
}

export function formatTaipeiMeetingDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(value));
}

export function formatTaipeiMeetingTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TAIPEI_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function formatTaipeiMeetingDateTime(value: string) {
  return `${formatTaipeiMeetingDate(value)} ${formatTaipeiMeetingTime(value)}`;
}

export function formatTaipeiDateTimeLocalInput(value: string | null) {
  if (!value) return "";
  const parts = partsToRecord(new Intl.DateTimeFormat("en-US", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value)));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function isUpcomingMeeting(meeting: { status: string; meeting_at: string }, now = new Date()) {
  return meeting.status === "scheduled" && new Date(meeting.meeting_at).getTime() > now.getTime();
}

export function isPastScheduledMeeting(meeting: { status: string; meeting_at: string }, now = new Date()) {
  return meeting.status === "scheduled" && new Date(meeting.meeting_at).getTime() <= now.getTime();
}
