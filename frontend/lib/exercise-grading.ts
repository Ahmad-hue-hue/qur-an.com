import type { ExerciseAnswerGrade, QuestionType } from "@/lib/types";
import { QUESTION_TYPE_LABELS } from "@/lib/exercise-questions";

export function isManualQuestionType(type: QuestionType): boolean {
  return type === "fill_blank" || type === "fill_gap" || type === "written";
}

export function isAutoGradedGrade(grade: ExerciseAnswerGrade): boolean {
  return !isManualQuestionType(grade.question_type);
}

export function gradeResultLabel(grade: ExerciseAnswerGrade): string {
  if (isManualQuestionType(grade.question_type)) {
    if (grade.score == null) return "Awaiting manual grade";
    return `Graded ${grade.score}/${grade.max_score}`;
  }

  if (grade.score == null) return "Not graded";
  if (grade.score >= grade.max_score) return "Correct (auto)";
  return "Incorrect (auto)";
}

export function gradeResultTone(
  grade: ExerciseAnswerGrade
): "success" | "danger" | "warning" | "muted" {
  if (isManualQuestionType(grade.question_type) && grade.score == null) {
    return "warning";
  }
  if (grade.score == null) return "muted";
  if (grade.score >= grade.max_score) return "success";
  if (grade.score > 0) return "success";
  return "danger";
}

export const GRADE_TONE_CLASSES = {
  success: "bg-emerald-light text-emerald-deep border-emerald-deep/20",
  danger: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

export function questionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPE_LABELS[type];
}
