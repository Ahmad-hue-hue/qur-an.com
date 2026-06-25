import type { CreateQuestionData, QuestionType } from "@/lib/types";

export const EXERCISE_QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  short: string;
}[] = [
  { value: "mcq", label: "Multiple Choice", short: "MCQ" },
  { value: "fill_blank", label: "Fill in the Blank", short: "Fill Blank" },
  { value: "true_false", label: "True / False", short: "True/False" },
  { value: "fill_gap", label: "Fill the Gap", short: "Fill Gap" },
];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  fill_blank: "Fill in the Blank",
  true_false: "True / False",
  fill_gap: "Fill the Gap",
  written: "Written Answer",
};

export function buildQuestionPayload(
  form: CreateQuestionData & { option_a?: string; option_b?: string }
): CreateQuestionData {
  const payload: CreateQuestionData = {
    type: form.type,
    text: form.text,
    max_score: form.max_score ?? 1,
    arabic_text: form.arabic_text,
  };

  if (form.type === "mcq") {
    payload.options = [form.option_a, form.option_b].filter(Boolean) as string[];
    payload.correct_answer = form.correct_answer || form.option_a || "";
  } else if (form.type === "true_false") {
    payload.correct_answer = form.correct_answer || "true";
  } else if (form.type === "fill_blank") {
    payload.correct_answer = form.correct_answer ?? "";
  }

  return payload;
}
