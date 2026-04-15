/**
 * Horaires au format JSON stocké sur Tenant.openingHoursJson :
 * { "mon": { "open": "11:30", "close": "22:00", "closed": false }, "sun": { "closed": true }, ... }
 * Clés : mon, tue, wed, thu, fri, sat, sun
 */

const DAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export type DayScheduleJson = {
  open?: string;
  close?: string;
  closed?: boolean;
};

function parseHm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) {
    return null;
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return h * 60 + min;
}

function localParts(
  date: Date,
  timeZone: string,
): { dayIndex: number; minutes: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const wd = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    dayIndex: map[wd ?? ""] ?? 0,
    minutes: hour * 60 + minute,
  };
}

export function isRestaurantOpenNow(
  openingHoursJson: string | null | undefined,
  now = new Date(),
  timeZone = "Europe/Paris",
): boolean {
  if (!openingHoursJson?.trim()) {
    return true;
  }
  let parsed: Record<string, DayScheduleJson>;
  try {
    parsed = JSON.parse(openingHoursJson) as Record<string, DayScheduleJson>;
  } catch {
    return true;
  }
  const { dayIndex, minutes } = localParts(now, timeZone);
  const key = DAY_KEYS[dayIndex];
  const day = parsed[key];
  if (!day || day.closed === true) {
    return false;
  }
  if (!day.open || !day.close) {
    return true;
  }
  const o = parseHm(day.open);
  const c = parseHm(day.close);
  if (o === null || c === null) {
    return true;
  }
  if (c <= o) {
    return minutes >= o || minutes < c;
  }
  return minutes >= o && minutes < c;
}
