"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
      toast.success(`Submitted! Score: ${result.score}/${result.max_score}`);
      router.push("/assessments");
    },
  });

  if (loadingEx || loadingQ) {
    return (
      <AppShell variant="auth">
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!exercise || !questions?.length) return null;

  if (exercise.status === "expired") {
    return (
      <AppShell variant="auth">
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full">
            <CardContent className="p-8 text-center">
              <p className="text-xl font-semibold text-muted-foreground">
                Expired
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This exercise is no longer available.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const question = questions[currentQ];
  const isLast = currentQ === questions.length - 1;

  return (
    <AppShell variant="auth">
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
            Question {currentQ + 1} of {questions.length}
          </span>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        <Card className="card-shadow">
          <CardContent className="p-5">
            <p className="font-medium leading-relaxed">{question.text}</p>
            {question.arabic_text && (
              <p className="font-arabic text-lg mt-3">{question.arabic_text}</p>
            )}
          </CardContent>
        </Card>

        {question.type === "mcq" && question.options ? (
          <RadioGroup
            value={answers[question.id] || ""}
            onValueChange={(v) =>
              setAnswers((prev) => ({ ...prev, [question.id]: v }))
            }
            className="space-y-2"
          >
            {question.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const selected = answers[question.id] === opt;
              return (
                <Label
                  key={i}
                  htmlFor={`opt-${i}`}
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
                  <span className={cn("flex-1", /[\u0600-\u06FF]/.test(opt) && "font-arabic text-lg")}>
                    {opt}
                  </span>
                  <RadioGroupItem value={opt} id={`opt-${i}`} className="sr-only" />
                </Label>
              );
            })}
          </RadioGroup>
        ) : (
          <Textarea
            placeholder="Type your answer..."
            value={answers[question.id] || ""}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                [question.id]: e.target.value,
              }))
            }
            className="min-h-32"
          />
        )}

        <Button
          className="w-full h-12 bg-emerald-deep hover:bg-emerald-mid text-cream gap-2"
          disabled={!answers[question.id]}
          onClick={() => {
            if (isLast) {
              submitMutation.mutate();
            } else {
              setCurrentQ((q) => q + 1);
            }
          }}
        >
          {isLast ? "Submit Exercise" : "Next Question"}
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
        </Button>
      </div>
    </AppShell>
  );
}
