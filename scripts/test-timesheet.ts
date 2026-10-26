import assert from "node:assert/strict";

import { calculateDay } from "../src/lib/ponto/calculate-timesheet.ts";

function at(iso: string) {
  return new Date(`${iso}:00-03:00`);
}

const base = {
  expectedMinutes: 9 * 60,
  firstOvertimeMinutes: 60,
  toleranceMinutes: 10,
  nightStart: 22 * 60,
  nightEnd: 5 * 60,
  abono: false,
  status: "normal" as const,
  inProgress: false,
};

const regular = calculateDay({
  ...base,
  punches: {
    entry: at("2026-10-26T08:00"),
    lunchOut: at("2026-10-26T12:00"),
    lunchIn: at("2026-10-26T13:00"),
    exit: at("2026-10-26T18:00"),
  },
});
assert.equal(regular.workedMinutes, 540);
assert.equal(regular.delayMinutes, 0);
assert.equal(regular.overtimeMinutes, 0);

const late = calculateDay({
  ...base,
  punches: {
    entry: at("2026-10-26T08:12"),
    lunchOut: at("2026-10-26T12:00"),
    lunchIn: at("2026-10-26T13:00"),
    exit: at("2026-10-26T18:00"),
  },
});
assert.equal(late.workedMinutes, 528);
assert.equal(late.delayMinutes, 12);

const withinTolerance = calculateDay({
  ...base,
  punches: {
    entry: at("2026-10-26T08:00"),
    lunchOut: at("2026-10-26T12:00"),
    lunchIn: at("2026-10-26T13:00"),
    exit: at("2026-10-26T18:08"),
  },
});
assert.equal(withinTolerance.overtimeMinutes, 0);

const extra = calculateDay({
  ...base,
  punches: {
    entry: at("2026-10-26T08:00"),
    lunchOut: at("2026-10-26T12:00"),
    lunchIn: at("2026-10-26T13:00"),
    exit: at("2026-10-26T19:30"),
  },
});
assert.equal(extra.workedMinutes, 630);
assert.equal(extra.overtimeMinutes, 90);
assert.equal(extra.extra50Minutes, 60);
assert.equal(extra.extra100Minutes, 30);

const sunday = calculateDay({
  ...base,
  expectedMinutes: 0,
  firstOvertimeMinutes: 0,
  punches: {
    entry: at("2026-10-25T08:00"),
    exit: at("2026-10-25T12:00"),
  },
});
assert.equal(sunday.workedMinutes, 240);
assert.equal(sunday.extra50Minutes, 0);
assert.equal(sunday.extra100Minutes, 240);

const forgiven = calculateDay({
  ...base,
  abono: true,
  punches: {
    entry: at("2026-10-26T09:00"),
    lunchOut: at("2026-10-26T12:00"),
    lunchIn: at("2026-10-26T13:00"),
    exit: at("2026-10-26T18:00"),
  },
});
assert.equal(forgiven.delayMinutes, 0);

const night = calculateDay({
  ...base,
  expectedMinutes: 0,
  firstOvertimeMinutes: 0,
  punches: {
    entry: at("2026-10-26T22:00"),
    lunchOut: at("2026-10-26T23:30"),
  },
});
assert.equal(night.nightMinutes, 90);
assert.equal(night.workedMinutes, 90);

console.log("timesheet ok");
