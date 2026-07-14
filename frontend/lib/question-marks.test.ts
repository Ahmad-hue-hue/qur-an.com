import { describe, expect, it } from "bun:test";
import { marksInputValue, normalizeQuestionMarks } from "@/lib/question-marks";

describe("normalizeQuestionMarks", () => {
  it("defaults invalid values to 1", () => {
    expect(normalizeQuestionMarks(undefined)).toBe(1);
    expect(normalizeQuestionMarks("")).toBe(1);
    expect(normalizeQuestionMarks(0)).toBe(1);
  });

  it("parses string and number marks", () => {
    expect(normalizeQuestionMarks("5")).toBe(5);
    expect(normalizeQuestionMarks(10)).toBe(10);
  });

  it("formats input values", () => {
    expect(marksInputValue(3)).toBe("3");
    expect(marksInputValue("")).toBe("1");
  });
});
