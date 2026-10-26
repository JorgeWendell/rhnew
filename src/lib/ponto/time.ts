import { TIME_ZONE } from "@/lib/ponto/constants";

export function saoPauloParts(date: Date): {
  date: string;
  time: string;
  minutes: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  let hour = read("hour");
  if (hour === "24") hour = "00";
  const minute = read("minute");

  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
    minutes: Number(hour) * 60 + Number(minute),
  };
}

export function todayInSaoPaulo(now = new Date()): string {
  return saoPauloParts(now).date;
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 8)}01`;
}

export function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function formatTime(date: Date): string {
  return saoPauloParts(date).time;
}

export function formatDateTime(date: Date): string {
  const parts = saoPauloParts(date);
  return `${formatDateBR(parts.date)} ${parts.time}`;
}

export function formatMinutes(total: number): string {
  const rounded = Math.round(total);
  const sign = rounded < 0 ? "-" : "";
  const absolute = Math.abs(rounded);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseClock(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function saoPauloDateTime(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Data ou hora inválida");
  }
  return new Date(`${date}T${time}:00-03:00`);
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;

  while (cursor <= to && dates.length <= 370) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

export function weekdayIndex(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function diffDays(from: string, to: string): number {
  const [year, month, day] = from.split("-").map(Number);
  const [yearTo, monthTo, dayTo] = to.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  const end = Date.UTC(yearTo, monthTo - 1, dayTo);
  return Math.round((end - start) / 86_400_000);
}

export function currentYearInSaoPaulo(): number {
  return Number(todayInSaoPaulo().slice(0, 4));
}
