"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { studentApi } from "@/lib/api";
import { QUESTION_TYPE_LABELS } from "@/lib/exercise-questions";
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
  ArrowRight01Icon,
  Clock01Icon,
  Home01Icon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { StatusBadge } from "@/components/shared/status-badge";

export default function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const exerciseId = parseInt(id);
  const router = useRouter();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const { data: exercise, isLoading: loadingEx, error: exerciseError } = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: () => studentApi.getExercise(exerciseId),
  });

  useEffect(() => {
    if (exercise?.has_submitted) {
      router.replace(`/exercises/${exerciseId}/results`);
    }
  }, [exercise?.has_submitted, exerciseId, router]);

  const canLoadQuestions =
    Boolean(exercise) &&
    exercise!.status === "open" &&
    !exercise!.has_submitted &&
    exercise!.question_count > 0;

  const { data: questions, isLoading: loadingQ } = useQuery({
    queryKey: ["exercise-questions", exerciseId],
    queryFn: () => studentApi.getExerciseQuestions(exerciseId),
    enabled: canLoadQuestions,
  });

  const submitMutation = useMutation({
    mutationFn: () => studentApi.submitExercise(exerciseId, answers),
    onSuccess: (result) => {
      const pending = result.grading_status === "pending_manual";
      toast.success(
        pending
          ? `Submitted! Auto score: ${result.score}/${result.max_score}. Some answers await teacher review.`
          : `Submitted! Score: ${result.score}/${result.max_score}`
      );
      router.push(`/exercises/${exerciseId}/results`);
    },
    onError: (err: Error) => toast.error(err.message || "Submission failed"),
  });

  const isLoading = loadingEx || (canLoadQuestions && loadingQ);
  const question = questions?.[currentQ] ?? null;
  const isLast = questions ? currentQ === questions.length - 1 : false;
  const hasAnswer = question ? Boolean(answers[question.id]?.trim()) : false;
  const canTake = Boolean(exercise && questions?.length && exercise.status === "open");

  return (
    <AppShell variant="auth">
      {isLoading && (
        <div className="page-loading">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!isLoading && exerciseError && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full max-w-lg">
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-xl font-semibold text-emerald-deep">
                Exercise unavailable
              </p>
              <p className="text-sm text-muted-foreground">
                {exerciseError.message}
              </p>
              <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
                Back to assessments
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !exerciseError && exercise && exercise.status === "upcoming" && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full max-w-lg">
            <CardContent className="p-8 text-center space-y-3">
              <StatusBadge status="upcoming" />
              <p className="text-xl font-semibold text-emerald-deep">{exercise.title}</p>
              <p className="text-sm text-muted-foreground">
                Opens on {format(new Date(exercise.start_date), "MMM d, yyyy 'at' h:mm a")}
              </p>
              <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
                Back to assessments
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !exerciseError && exercise && exercise.status === "expired" && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full max-w-lg">
            <CardContent className="p-8 text-center space-y-3">
              <StatusBadge status="expired" />
              <p className="text-xl font-semibold text-emerald-deep">{exercise.title}</p>
              <p className="text-sm text-muted-foreground">
                {exercise.has_submitted
                  ? `This exercise closed on ${format(new Date(exercise.end_date), "MMM d, yyyy")}.`
                  : `You did not submit this exercise before it closed on ${format(new Date(exercise.end_date), "MMM d, yyyy")}.`}
              </p>
              <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
                Back to assessments
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading &&
        !exerciseError &&
        exercise &&
        exercise.status === "open" &&
        !exercise.has_submitted &&
        exercise.question_count === 0 && (
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            <Card className="card-shadow w-full max-w-lg">
              <CardContent className="p-8 text-center space-y-3">
                <p className="text-xl font-semibold text-emerald-deep">{exercise.title}</p>
                <p className="text-sm text-muted-foreground">
                  This exercise is open, but no questions have been added yet.
                </p>
                <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
                  Back to assessments
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

      {canTake && question && exercise && (
        <>
          <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-border page-inset-x py-3">
            <div className="flex items-center justify-between mb-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-sm text-emerald-deep hover:text-emerald-mid"
              >
                <HugeiconsIcon icon={Home01Icon} size={16} />
                Back to Home
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-gold-light rounded-full px-3 py-1">
                <HugeiconsIcon icon={Clock01Icon} size={16} className="text-gold" />
                <span className="text-sm font-medium text-emerald-deep">
                  Due {format(new Date(exercise.end_date), "MMM d, yyyy")}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                Question {currentQ + 1} of {questions!.length}
              </span>
            </div>
          </div>

          <div className="page-content max-w-3xl mx-auto">
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
              value={answers[question.id] || ""}
              onChange={(v) =>
                setAnswers((prev) => ({ ...prev, [question.id]: v }))
              }
            />

            <Button
              className="w-full h-12 bg-emerald-deep hover:bg-emerald-mid text-cream gap-2"
              disabled={!hasAnswer || submitMutation.isPending}
              onClick={() => {
                if (isLast) {
                  submitMutation.mutate();
                } else {
                  setCurrentQ((q) => q + 1);
                }
              }}
            >
              {isLast
                ? submitMutation.isPending
                  ? "Submitting..."
                  : "Submit Exercise"
                : "Next Question"}
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
