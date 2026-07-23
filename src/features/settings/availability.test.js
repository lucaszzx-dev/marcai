import { describe, expect, it } from "vitest";
import { periodsOverlap, validateAvailability } from "./availability";

describe("periodsOverlap", () => {
  it("detecta períodos que se cruzam", () => {
    expect(
      periodsOverlap(
        new Date("2026-07-22T10:00:00"),
        new Date("2026-07-22T11:00:00"),
        new Date("2026-07-22T10:30:00"),
        new Date("2026-07-22T12:00:00"),
      ),
    ).toBe(true);
  });
  it("permite horários encostados", () => {
    expect(
      periodsOverlap(
        new Date("2026-07-22T10:00:00"),
        new Date("2026-07-22T11:00:00"),
        new Date("2026-07-22T11:00:00"),
        new Date("2026-07-22T12:00:00"),
      ),
    ).toBe(false);
  });
});

describe("validateAvailability", () => {
  const hours = [
    { weekday: 3, enabled: true, start_time: "09:00", end_time: "18:00" },
  ];
  it("recusa atendimento fora do expediente", () => {
    expect(
      validateAvailability(
        new Date("2026-07-22T08:00:00"),
        new Date("2026-07-22T09:00:00"),
        hours,
        [],
      ),
    ).toContain("fora");
  });
});
