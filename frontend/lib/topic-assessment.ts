import type { QuestionType } from "@/lib/types";

export const TOPIC_EXERCISE_QUESTION_TYPES: QuestionType[] = ["mcq", "true_false"];

export function isLastLessonOrder(order: number, orders: number[]) {
  if (orders.length === 0) return false;
  return order === Math.max(...orders);
}

export function defaultExerciseDates() {
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 10);
  return {
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  };
}

export function defaultExamDates() {
  return defaultExerciseDates();
}
