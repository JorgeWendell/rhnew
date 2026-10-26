import type { DayStatus } from "@/lib/ponto/constants";
import { diffDays, saoPauloParts } from "@/lib/ponto/time";

export type PunchMap = {
  entry?: Date;
  lunchOut?: Date;
  lunchIn?: Date;
  exit?: Date;
};

export type WorkSegment = {
  start: number;
  end: number;
};

export type DayCalculation = {
  workedMinutes: number;
  delayMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  extra50Minutes: number;
  extra100Minutes: number;
};

function segment(start: Date, end: Date): WorkSegment | null {
  const startParts = saoPauloParts(start);
  const endParts = saoPauloParts(end);
  let endMinutes = endParts.minutes + diffDays(startParts.date, endParts.date) * 1440;
  if (endMinutes <= startParts.minutes) endMinutes += 1440;
  if (endMinutes <= startParts.minutes) return null;
  return { start: startParts.minutes, end: endMinutes };
}

export function workedSegments(punches: PunchMap): WorkSegment[] {
  const segments: WorkSegment[] = [];
  const push = (start?: Date, end?: Date) => {
    if (!start || !end) return;
    const value = segment(start, end);
    if (value) segments.push(value);
  };

  const hasLunch = Boolean(punches.lunchOut || punches.lunchIn);
  if (hasLunch) {
    push(punches.entry, punches.lunchOut);
    push(punches.lunchIn, punches.exit);
  } else {
    push(punches.entry, punches.exit);
  }

  return segments;
}

export function nightMinutes(
  segments: WorkSegment[],
  nightStart: number,
  nightEnd: number,
): number {
  const windows: Array<[number, number]> = [];

  for (const offset of [0, 1440]) {
    if (nightEnd > nightStart) {
      windows.push([nightStart + offset, nightEnd + offset]);
    } else {
      windows.push([nightStart + offset, 1440 + offset]);
      windows.push([offset, nightEnd + offset]);
    }
  }

  let total = 0;
  for (const item of segments) {
    for (const [start, end] of windows) {
      const from = Math.max(item.start, start);
      const to = Math.min(item.end, end);
      if (to > from) total += to - from;
    }
  }
  return total;
}

function aboveTolerance(minutes: number, tolerance: number): number {
  if (minutes <= tolerance) return 0;
  return minutes;
}

export function calculateDay(input: {
  punches: PunchMap;
  expectedMinutes: number;
  firstOvertimeMinutes: number;
  toleranceMinutes: number;
  nightStart: number;
  nightEnd: number;
  abono: boolean;
  status: DayStatus;
  inProgress: boolean;
}): DayCalculation {
  if (input.status !== "normal") {
    return {
      workedMinutes: 0,
      delayMinutes: 0,
      overtimeMinutes: 0,
      nightMinutes: 0,
      extra50Minutes: 0,
      extra100Minutes: 0,
    };
  }

  const segments = workedSegments(input.punches);
  const workedMinutes = segments.reduce((sum, item) => sum + (item.end - item.start), 0);
  const rawDelay = Math.max(0, input.expectedMinutes - workedMinutes);
  const rawOvertime = Math.max(0, workedMinutes - input.expectedMinutes);
  const delayMinutes =
    input.abono || input.inProgress || !input.punches.entry
      ? 0
      : aboveTolerance(rawDelay, input.toleranceMinutes);
  const overtimeMinutes = input.inProgress
    ? 0
    : aboveTolerance(rawOvertime, input.toleranceMinutes);
  const extra50Minutes = Math.min(overtimeMinutes, Math.max(0, input.firstOvertimeMinutes));
  const extra100Minutes = Math.max(0, overtimeMinutes - extra50Minutes);

  return {
    workedMinutes,
    delayMinutes,
    overtimeMinutes,
    nightMinutes: nightMinutes(segments, input.nightStart, input.nightEnd),
    extra50Minutes,
    extra100Minutes,
  };
}
