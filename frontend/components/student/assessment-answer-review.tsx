"use client";

import type { ExerciseAnswerGrade, Question } from "@/lib/types";
import { QUESTION_TYPE_LABELS } from "@/lib/exercise-questions";
import { GRADE_TONE_CLASSES, gradeResultTone } from "@/lib/exercise-grading";
import { AssessmentQuestionInput } from "@/components/student/assessment-question-input";
import { FormattedText } from "@/components/shared/formatted-text";
import { cn } from "@/lib/utils";

function formatCorrectAnswer(type: string, answer?: string) {
  if (!answer) return "—";
  if (type === "true_false") {
    return answer.toLowerCase() === "true" ? "True" : "False";
  }
  return answer;
}

function questionFromGrade(grade: ExerciseAnswerGrade): Question | null {
  if (grade.question_type === "mcq" && !grade.question_options?.length) {
    return null;
  }
  return {
    id: grade.question_id,
    type: grade.question_type,
    text: grade.question_text,
    options: grade.question_options,
    order: grade.question_order ?? 0,
  };
}

export function AssessmentAnswerReviewCard({
  grade,
  index,
}: {
  grade: ExerciseAnswerGrade;
  index: number;
}) {
  const isCorrect =
    grade.score != null && grade.max_score > 0 && grade.score >= grade.max_score;
  const tone = gradeResultTone(grade);
  const question = questionFromGrade(grade);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        isCorrect
          ? "border-emerald-deep/30 bg-emerald-light/40"
          : "border-red-200 bg-red-50/60"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-emerald-deep">
          Question {index + 1} · {QUESTION_TYPE_LABELS[grade.question_type]}
        </span>
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
            GRADE_TONE_CLASSES[tone]
          )}
        >
          {isCorrect ? "Correct" : "Incorrect"} · {grade.score ?? 0}/{grade.max_score}
        </span>
      </div>

      <FormattedText className="text-sm font-medium">
        {grade.question_text}
      </FormattedText>

      {question ? (
        <AssessmentQuestionInput
          question={question}
          value={grade.answer_text}
          onChange={() => {}}
          readOnly
          reviewResult={{
            correctAnswer: grade.correct_answer ?? "",
            isCorrect,
          }}
        />
      ) : (
        <div className="rounded-lg bg-background/80 border border-border/70 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Your answer
          </p>
          <FormattedText className="text-sm mt-1">
            {grade.answer_text || "(no answer)"}
          </FormattedText>
        </div>
      )}

      {!isCorrect && grade.correct_answer && (
        <div className="rounded-lg border border-emerald-deep/30 bg-emerald-light/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-emerald-deep">
            Correct answer
          </p>
          <FormattedText className="text-sm mt-1 font-medium text-emerald-deep">
            {formatCorrectAnswer(grade.question_type, grade.correct_answer)}
          </FormattedText>
        </div>
      )}
    </div>
  );
}
