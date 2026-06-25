"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { studentApi } from "@/lib/api";
import { QUESTION_TYPE_LABELS } from "@/lib/exercise-questions";
import {
  AssessmentQuestionInput,
  formatCountdown,
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
import { useCountdown } from "@/lib/hooks/use-countdown";

export default function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const examId = parseInt(id);
  const router = useRouter();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const autoSubmitted = useRef(false);

  const { data: exam, isLoading: loadingEx, error: examError } = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => studentApi.getExam(examId),
  });

  useEffect(() => {
    if (exam?.has_submitted) {
      router.replace(`/exams/${examId}/results`);
    }
  }, [exam?.has_submitted, examId, router]);

  const canLoadQuestions =
    Boolean(exam) &&
    exam!.status === "open" &&
    !exam!.has_submitted &&
    exam!.question_count > 0;

  const { data: session, isLoading: loadingSession, error: sessionError } = useQuery({
    queryKey: ["exam-session", examId],
    queryFn: () => studentApi.startExam(examId),
    enabled: canLoadQuestions,
    retry: false,
  });

  const { data: questions, isLoading: loadingQ } = useQuery({
    queryKey: ["exam-questions", examId],
    queryFn: () => studentApi.getExamQuestions(examId),
    enabled: canLoadQuestions && Boolean(session),
  });

  const submitMutation = useMutation({
    mutationFn: () => studentApi.submitExam(examId, answers),
    onSuccess: (result) => {
      const pending = result.grading_status === "pending_manual";
      toast.success(
        pending
          ? `Submitted! Auto score: ${result.score}/${result.max_score}. Some answers await teacher review.`
          : `Exam submitted! Score: ${result.score}/${result.max_score}`
      );
      router.push(`/exams/${examId}/results`);
    },
    onError: (err: Error) => toast.error(err.message || "Submission failed"),
  });

  const remainingSeconds = useCountdown(session?.deadline_at);

  useEffect(() => {
    if (
      remainingSeconds === 0 &&
      canLoadQuestions &&
      !submitMutation.isPending &&
      !autoSubmitted.current
    ) {
      autoSubmitted.current = true;
      submitMutation.mutate();
    }
  }, [remainingSeconds, canLoadQuestions, submitMutation]);

  const isLoading =
    loadingEx || (canLoadQuestions && (loadingSession || loadingQ));
  const loadError = examError || sessionError;
  const question = questions?.[currentQ] ?? null;
  const isLast = questions ? currentQ === questions.length - 1 : false;
  const hasAnswer = question ? Boolean(answers[question.id]?.trim()) : false;
  const canTake = Boolean(
    exam && questions?.length && exam.status === "open" && session
  );
  const timeExpired = remainingSeconds === 0;

  return (
    <AppShell variant="auth">
      {isLoading && (
        <div className="page-loading">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!isLoading && loadError && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full max-w-lg">
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-xl font-semibold text-emerald-deep">
                Exam unavailable
              </p>
              <p className="text-sm text-muted-foreground">
                {loadError.message}
              </p>
              <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
                Back to assessments
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !loadError && exam && exam.status === "upcoming" && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full max-w-lg">
            <CardContent className="p-8 text-center space-y-3">
              <StatusBadge status="upcoming" />
              <p className="text-xl font-semibold text-emerald-deep">{exam.title}</p>
              <p className="text-sm text-muted-foreground">
                Opens on {format(new Date(exam.start_date), "MMM d, yyyy 'at' h:mm a")}
              </p>
              <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
                Back to assessments
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !loadError && exam && exam.status === "expired" && !exam.has_submitted && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full max-w-lg">
            <CardContent className="p-8 text-center space-y-3">
              <StatusBadge status="expired" />
              <p className="text-xl font-semibold text-emerald-deep">{exam.title}</p>
              <p className="text-sm text-muted-foreground">
                This exam closed on {format(new Date(exam.end_date), "MMM d, yyyy")}
              </p>
              <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
                Back to assessments
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading &&
        !loadError &&
        exam &&
        exam.status === "open" &&
        exam.question_count === 0 && (
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            <Card className="card-shadow w-full max-w-lg">
              <CardContent className="p-8 text-center space-y-3">
                <p className="text-xl font-semibold text-emerald-deep">{exam.title}</p>
                <p className="text-sm text-muted-foreground">
                  This exam is open, but no questions have been added yet.
                </p>
                <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
                  Back to assessments
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

      {canTake && question && (
        <>
          <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-border page-inset-x py-3">
            <div className="flex items-center justify-between mb-2">
              <Link
                href="/assessments"
                className="inline-flex items-center gap-1 text-sm text-emerald-deep hover:text-emerald-mid"
              >
                <HugeiconsIcon icon={Home01Icon} size={16} />
                Back to assessments
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-gold-light rounded-full px-3 py-1">
                <HugeiconsIcon icon={Clock01Icon} size={16} className="text-gold" />
                <span className="text-sm font-medium text-emerald-deep">
                  {remainingSeconds != null
                    ? formatCountdown(remainingSeconds)
                    : "—"}
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
              disabled={
                !hasAnswer || submitMutation.isPending || timeExpired
              }
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
                  : "Submit Exam"
                : "Next Question"}
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
