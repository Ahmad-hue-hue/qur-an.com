"use client";

import Link from "next/link";
import { formatAssessmentMark } from "@/lib/assessment-mark";
import type { ExerciseAnswerGrade } from "@/lib/types";
import { FormattedText } from "@/components/shared/formatted-text";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatCorrectAnswer(type: string, answer?: string) {
  if (!answer) return "—";
  if (type === "true_false") {
    return answer.toLowerCase() === "true" ? "True" : "False";
  }
  return answer;
}

function MinimalAnswerRow({
  grade,
  index,
}: {
  grade: ExerciseAnswerGrade;
  index: number;
}) {
  const isCorrect =
    grade.score != null && grade.max_score > 0 && grade.score >= grade.max_score;

  return (
    <div
      className={cn(
        "border-b border-border/50 py-3 last:border-0",
        !isCorrect && "text-red-800"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <FormattedText className="text-sm leading-snug flex-1 min-w-0">
          <span className="text-muted-foreground mr-1.5">{index + 1}.</span>
          {grade.question_text}
        </FormattedText>
        <span
          className={cn(
            "shrink-0 text-xs font-medium pt-0.5",
            isCorrect ? "text-emerald-deep" : "text-red-600"
          )}
        >
          {isCorrect ? "Correct" : "Incorrect"}
        </span>
      </div>
      {!isCorrect && grade.correct_answer && (
        <p className="mt-1.5 text-xs text-emerald-deep pl-5">
          Correct: {formatCorrectAnswer(grade.question_type, grade.correct_answer)}
        </p>
      )}
    </div>
  );
}

export function AssessmentResultsPanel({
  title,
  score,
  maxScore,
  answerGrades = [],
}: {
  title: string;
  score: number;
  maxScore: number;
  answerGrades?: ExerciseAnswerGrade[];
}) {
  return (
    <div className="page-content max-w-lg mx-auto space-y-8 py-10">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-4xl font-semibold tracking-tight text-emerald-deep">
          {formatAssessmentMark(score, maxScore)}
        </p>
      </div>

      {answerGrades.length > 0 && (
        <div>
          {answerGrades.map((grade, index) => (
            <MinimalAnswerRow key={grade.id} grade={grade} index={index} />
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
