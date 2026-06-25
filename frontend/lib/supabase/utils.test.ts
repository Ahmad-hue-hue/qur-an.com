import { describe, expect, test } from "bun:test";
import { normalizePhone, splitFullName } from "./utils";

describe("normalizePhone", () => {
  test("strips non-digits", () => {
    expect(normalizePhone("+255 712 345 678")).toBe("255712345678");
  });

  test("handles empty input", () => {
    expect(normalizePhone("")).toBe("");
  });
});

describe("splitFullName", () => {
  test("splits first and last name", () => {
    expect(splitFullName("Asmaa Abubakary")).toEqual({
      firstName: "Asmaa",
      lastName: "Abubakary",
    });
  });

  test("single name has empty last name", () => {
    expect(splitFullName("ZAKARIYA")).toEqual({
      firstName: "ZAKARIYA",
      lastName: "",
    });
  });

  test("trims extra whitespace", () => {
    expect(splitFullName("  Ahmad   Hassan  Ali  ")).toEqual({
      firstName: "Ahmad",
      lastName: "Hassan Ali",
    });
  });
});
