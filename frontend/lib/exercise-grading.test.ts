import { describe, expect, test } from "bun:test";
import {
  gradeResultLabel,
  gradeResultTone,
  isManualQuestionType,
} from "./exercise-grading";
import type { ExerciseAnswerGrade } from "@/lib/types";

function grade(
  overrides: Partial<ExerciseAnswerGrade>
): ExerciseAnswerGrade {
  return {
    id: 1,
    submission_id: 1,
    question_id: 1,
    question_type: "mcq",
    answer_text: "A",
    score: 1,
    max_score: 1,
    feedback: "",
    graded_at: null,
    ...overrides,
  };
}

describe("isManualQuestionType", () => {
  test("mcq is auto-graded", () => {
    expect(isManualQuestionType("mcq")).toBe(false);
  });

  test("written is manual", () => {
    expect(isManualQuestionType("written")).toBe(true);
  });
});

describe("gradeResultLabel", () => {
  test("auto correct", () => {
    expect(gradeResultLabel(grade({ score: 1, max_score: 1 }))).toBe(
      "Correct (auto)"
    );
  });

  test("manual pending", () => {
    expect(
      gradeResultLabel(
        grade({ question_type: "written", score: null, max_score: 5 })
      )
    ).toBe("Awaiting manual grade");
  });
});

describe("gradeResultTone", () => {
  test("warning when manual grade pending", () => {
    expect(
      gradeResultTone(
        grade({ question_type: "fill_gap", score: null, max_score: 2 })
      )
    ).toBe("warning");
  });
});
