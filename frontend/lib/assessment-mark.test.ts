import { describe, expect, test } from "bun:test";
import { formatAssessmentMark, totalQuestionMarks } from "@/lib/assessment-mark";

describe("formatAssessmentMark", () => {
  test("shows raw fraction", () => {
    expect(formatAssessmentMark(3, 5)).toBe("3/5");
  });

  test("handles perfect score", () => {
    expect(formatAssessmentMark(4, 4)).toBe("4/4");
  });

  test("handles no questions", () => {
    expect(formatAssessmentMark(0, 0)).toBe("No questions");
  });
});

describe("totalQuestionMarks", () => {
  test("sums question marks", () => {
    expect(
      totalQuestionMarks([{ max_score: 2 }, { max_score: 3 }, { max_score: 1 }])
    ).toBe(6);
  });

  test("defaults missing marks to 1", () => {
    expect(totalQuestionMarks([{}, { max_score: 5 }])).toBe(6);
  });
});
