"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { studentApi } from "@/lib/api";
import type { Question, QuestionType } from "@/lib/types";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Clock01Icon,
  Home01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

function renderBlankText(text: string) {
  const parts = text.split(/_{2,}/);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <span className="inline-block min-w-16 border-b-2 border-emerald-deep mx-1" />
      )}
    </span>
  ));
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}) {
  const type = question.type as QuestionType;

  if (type === "mcq" && question.options) {
    return (
      <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
        {question.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const selected = value === opt;
          return (
            <Label
              key={i}
              htmlFor={`opt-${question.id}-${i}`}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border card-shadow cursor-pointer transition-all",
                selected
                  ? "border-emerald-deep bg-emerald-light"
                  : "border-border hover:border-emerald-mid/30"
              )}
            >
              <span
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  selected
                    ? "bg-emerald-deep text-cream"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {letter}
              </span>
              <span
                className={cn(
                  "flex-1",
                  /[\u0600-\u06FF]/.test(opt) && "font-arabic text-lg"
                )}
              >
                {opt}
              </span>
              <RadioGroupItem
                value={opt}
                id={`opt-${question.id}-${i}`}
                className="sr-only"
              />
            </Label>
          );
        })}
      </RadioGroup>
    );
  }

  if (type === "true_false") {
    return (
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-2 gap-3">
        {["true", "false"].map((opt) => {
          const selected = value === opt;
          return (
            <Label
              key={opt}
              htmlFor={`tf-${question.id}-${opt}`}
              className={cn(
                "flex items-center justify-center p-4 rounded-xl border card-shadow cursor-pointer font-medium capitalize transition-all",
                selected
                  ? "border-emerald-deep bg-emerald-light text-emerald-deep"
                  : "border-border hover:border-emerald-mid/30"
              )}
            >
              {opt}
              <RadioGroupItem
                value={opt}
                id={`tf-${question.id}-${opt}`}
                className="sr-only"
              />
            </Label>
          );
        })}
      </RadioGroup>
    );
  }

  if (type === "fill_blank") {
    return (
      <Input
        placeholder="Type your answer..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 text-base"
      />
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Type your answer..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-32"
      />
      {(type === "fill_gap" || type === "written") && (
        <p className="text-xs text-muted-foreground">
          This answer will be reviewed by your teacher.
        </p>
      )}
    </div>
  );
}

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

  const { data: exercise, isLoading: loadingEx } = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: () => studentApi.getExercise(exerciseId),
  });

  const { data: questions, isLoading: loadingQ } = useQuery({
    queryKey: ["exercise-questions", exerciseId],
    queryFn: () => studentApi.getExerciseQuestions(exerciseId),
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
      router.push("/assessments");
    },
  });

  const isLoading = loadingEx || loadingQ;
  const hasData = Boolean(exercise && questions?.length);
  const isExpired = hasData && exercise!.status === "expired";
  const canTake = hasData && !isExpired;
  const question = canTake ? questions![currentQ] : null;
  const isLast = canTake ? currentQ === questions!.length - 1 : false;
  const hasAnswer = question ? Boolean(answers[question.id]?.trim()) : false;

  return (
    <AppShell variant="auth">
      {isLoading && (
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!isLoading && hasData && isExpired && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full">
            <CardContent className="p-8 text-center">
              <p className="text-xl font-semibold text-muted-foreground">Expired</p>
              <p className="text-sm text-muted-foreground mt-2">
                This exercise is no longer available.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {canTake && question && (
        <>
          <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-border px-4 py-3">
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
                <span className="text-sm font-medium text-emerald-deep">29:45</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Question {currentQ + 1} of {questions!.length}
              </span>
            </div>
          </div>

          <div className="px-4 py-6 space-y-6">
            <Card className="card-shadow">
              <CardContent className="p-5">
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

            <QuestionInput
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
