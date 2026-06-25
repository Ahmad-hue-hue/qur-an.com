import { describe, expect, test } from "bun:test";
import { nextRegistrationNumber } from "./registration-number";

describe("nextRegistrationNumber", () => {
  test("starts at 1 for a new cohort", () => {
    expect(
      nextRegistrationNumber(1, new Date("2026-06-24"), [])
    ).toBe("1.6.1A");
  });

  test("continues sequence within same marhalah and year digit", () => {
    expect(
      nextRegistrationNumber(1, new Date("2025-01-01"), ["1.5.18A"])
    ).toBe("1.5.19A");
  });

  test("ignores numbers from other cohorts", () => {
    expect(
      nextRegistrationNumber(1, new Date("2026-01-01"), ["1.5.18A"])
    ).toBe("1.6.1A");
  });

  test("uses current marhalah in the prefix", () => {
    expect(
      nextRegistrationNumber(2, new Date("2026-03-01"), ["2.6.3A"])
    ).toBe("2.6.4A");
  });
});
