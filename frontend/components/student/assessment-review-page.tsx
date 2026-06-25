"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { QUESTION_TYPE_LABELS } from "@/lib/exercise-questions";
import {
  GRADE_TONE_CLASSES,
  gradeResultLabel,
  gradeResultTone,
  isManualQuestionType,
} from "@/lib/exercise-grading";
import {
  AssessmentQuestionInput,
  renderBlankText,
} from "@/components/student/assessment-question-input";
import { AppShell } from "@/components/layout/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import type { ExerciseAnswerGrade } from "@/lib/types";

export function AssessmentReviewPage({ exerciseId }: { exerciseId: number }) {
  const [currentQ, setCurrentQ] = useState(0);

  const exerciseQuery = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: () => studentApi.getExercise(exerciseId),
  });

  const resultsQuery = useQuery({
    queryKey: ["exercise-results", exerciseId],
    queryFn: () => studentApi.getExerciseResults(exerciseId),
    enabled: Boolean(exerciseQuery.data?.has_submitted),
  });

  const questionsQuery = useQuery({
    queryKey: ["exercise-questions", exerciseId],
    queryFn: () => studentApi.getExerciseQuestions(exerciseId),
    enabled: Boolean(exerciseQuery.data?.has_submitted),
  });

  const gradeByQuestionId = useMemo(() => {
    const map = new Map<number, ExerciseAnswerGrade>();
    for (const grade of resultsQuery.data?.answer_grades ?? []) {
      map.set(grade.question_id, grade);
    }
    return map;
  }, [resultsQuery.data?.answer_grades]);

  const exercise = exerciseQuery.data;
  const questions = questionsQuery.data;
  const results = resultsQuery.data;
  const isLoading =
    exerciseQuery.isLoading || resultsQuery.isLoading || questionsQuery.isLoading;
  const question = questions?.[currentQ] ?? null;
  const grade = question ? gradeByQuestionId.get(question.id) : undefined;
  const answer = grade?.answer_text ?? "";
  const isFirst = currentQ === 0;
  const isLast = questions ? currentQ === questions.length - 1 : false;

  return (
    <AppShell variant="auth">
      <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-border page-inset-x py-3 space-y-2">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1 text-sm text-emerald-deep hover:text-emerald-mid"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to assessments
        </Link>
        {exercise && results && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-emerald-deep">{exercise.title}</p>
              <p className="text-xs text-muted-foreground">Read-only review</p>
            </div>
            <p className="text-sm font-semibold text-emerald-deep">
              {results.score}/{results.max_score}
            </p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="page-loading">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!isLoading && exercise && !exercise.has_submitted && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full max-w-lg">
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-xl font-semibold text-emerald-deep">{exercise.title}</p>
              <p className="text-sm text-muted-foreground">
                Submit this exercise first to review your answers.
              </p>
              <Link
                href={`/exercises/${exerciseId}`}
                className={buttonVariants({
                  className: "bg-emerald-deep hover:bg-emerald-mid text-cream",
                })}
              >
                Take exercise
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && exercise?.has_submitted && question && (
        <div className="page-content max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Question {currentQ + 1} of {questions!.length}
            </span>
            <Link
              href={`/exercises/${exerciseId}/results`}
              className="text-emerald-deep hover:text-emerald-mid"
            >
              View score summary
            </Link>
          </div>

          <Card className="card-shadow">
            <CardContent className="p-5 space-y-3">
              <span className="inline-flex rounded-full bg-emerald-light px-3 py-1 text-xs font-medium text-emerald-deep">
                {QUESTION_TYPE_LABELS[question.type]}
              </span>
              <p className="font-medium leading-relaxed">
                {question.type === "fill_blank"
                  ? renderBlankText(question.text)
                  : question.text}
              </p>
              {question.arabic_text && (
                <p className="font-arabic text-lg mt-3">{question.arabic_text}</p>
              )}
            </CardContent>
          </Card>

          <AssessmentQuestionInput
            question={question}
            value={answer}
            onChange={() => {}}
            readOnly
          />

          {grade && (
            <Card className="card-shadow border-border/70">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${GRADE_TONE_CLASSES[gradeResultTone(grade)]}`}
                  >
                    {gradeResultLabel(grade)}
                  </span>
                  {!isManualQuestionType(grade.question_type) && (
                    <span className="text-[11px] text-muted-foreground">Auto-graded</span>
                  )}
                </div>
                {grade.correct_answer &&
                  !isManualQuestionType(grade.question_type) && (
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Correct answer
                      </p>
                      <p className="text-sm mt-1">{grade.correct_answer}</p>
                    </div>
                  )}
                {grade.feedback && (
                  <div className="rounded-lg border border-emerald-deep/20 bg-emerald-light/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-emerald-deep">
                      Teacher feedback
                    </p>
                    <p className="text-sm mt-1">{grade.feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={isFirst}
              onClick={() => setCurrentQ((q) => q - 1)}
            >
              Previous
            </Button>
            <Button
              className="flex-1 bg-emerald-deep hover:bg-emerald-mid text-cream gap-2"
              disabled={isLast}
              onClick={() => setCurrentQ((q) => q + 1)}
            >
              Next question
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
