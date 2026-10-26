export const TIME_ZONE = "America/Sao_Paulo";

export const FACE_MATCH_MAX_DISTANCE = 0.5;

export const PUNCH_TYPES = [
  { value: "entry", label: "Entrada" },
  { value: "lunch_in", label: "Entrada almoço" },
  { value: "lunch_out", label: "Saída almoço" },
  { value: "exit", label: "Saída" },
] as const;

export type PunchType = (typeof PUNCH_TYPES)[number]["value"];

export type DayStatus = "normal" | "falta" | "suspensao";

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const DEFAULT_RULES: Array<{
  weekday: number;
  expectedMinutes: number;
  firstOvertimeMinutes: number;
}> = [
  { weekday: 0, expectedMinutes: 0, firstOvertimeMinutes: 0 },
  { weekday: 1, expectedMinutes: 9 * 60, firstOvertimeMinutes: 60 },
  { weekday: 2, expectedMinutes: 9 * 60, firstOvertimeMinutes: 60 },
  { weekday: 3, expectedMinutes: 9 * 60, firstOvertimeMinutes: 60 },
  { weekday: 4, expectedMinutes: 9 * 60, firstOvertimeMinutes: 60 },
  { weekday: 5, expectedMinutes: 8 * 60, firstOvertimeMinutes: 60 },
  { weekday: 6, expectedMinutes: 0, firstOvertimeMinutes: 60 },
];

export function punchLabel(type: PunchType): string {
  return PUNCH_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function nextPunchType(existing: PunchType[]): PunchType | null {
  return PUNCH_TYPES.find((item) => !existing.includes(item.value))?.value ?? null;
}

export function duplicatePunchMessage(type: PunchType) {
  return `${punchLabel(type)} já registrada hoje`;
}
