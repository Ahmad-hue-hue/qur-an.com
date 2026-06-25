"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import type { QuestionType } from "@/lib/types";
import { QuestionTypePicker } from "@/components/admin/question-type-picker";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AdminExerciseWorkflowGuide } from "@/components/admin/admin-exercise-workflow-guide";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminExercisesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [marhalahId, setMarhalahId] = useState("1");
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: toLocalInputValue(now),
    end_date: toLocalInputValue(weekLater),
    question_type: "mcq" as QuestionType,
    question_text: "",
    option_a: "",
    option_b: "",
    correct_answer: "",
  });

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["admin-exercises", marhalahId],
    queryFn: () => adminApi.getExercises(parseInt(marhalahId)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createExercise({
        marhalah: parseInt(marhalahId),
        title: form.title,
        description: form.description,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        question_type: form.question_text.trim() ? form.question_type : undefined,
        question_text: form.question_text,
        question_options: [form.option_a, form.option_b].filter(Boolean),
        correct_answer: form.correct_answer || form.option_a,
      }),
    onSuccess: (exercise) => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
      toast.success("Exercise created");
      setShowForm(false);
      setForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        question_text: "",
        option_a: "",
        option_b: "",
        correct_answer: "",
      }));
      router.push(`/admin/exercises/${exercise.id}`);
    },
    onError: (err: Error) => toast.error(err.message || "Create failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
      setPendingDelete(null);
      toast.success("Exercise deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  return (
    <AppShell variant="admin">
      <PageHeader title="Exercise Management">
        <Select value={marhalahId} onValueChange={(v) => setMarhalahId(v ?? "1")}>
          <SelectTrigger className="w-40 bg-emerald-mid/30 border-cream/20 text-cream mt-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n)}>
                Marḥalah {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="page-content space-y-4">
        <AdminExerciseWorkflowGuide />

        <Card className="card-shadow border-emerald-deep/20 bg-emerald-light/30">
          <CardContent className="p-4 text-sm space-y-1">
            <p className="font-medium text-emerald-deep">Quick tips</p>
            <p className="text-muted-foreground">
              Students only see exercises for their current Marḥalah. If a student
              cannot see an exercise, check their Marḥalah in Admin → Students.
            </p>
            <p className="text-muted-foreground text-xs">
              Auto-graded: MCQ · True/False · Manual: Fill in the blank · Fill the gap · Written
            </p>
          </CardContent>
        </Card>

        <Button
          className="w-full sm:w-auto bg-emerald-deep hover:bg-emerald-mid text-cream gap-2"
          onClick={() => setShowForm((v) => !v)}
        >
          <HugeiconsIcon icon={Add01Icon} size={18} />
          {showForm ? "Cancel" : "Create Exercise"}
        </Button>

        {showForm && (
          <Card className="card-shadow">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
              <div className="form-grid-2">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, start_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, end_date: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>First question (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Pick a question type below, or leave blank and add questions on the next screen.
                </p>
                <QuestionTypePicker
                  value={form.question_type}
                  onChange={(question_type) =>
                    setForm((p) => ({
                      ...p,
                      question_type,
                      correct_answer: question_type === "true_false" ? "true" : "",
                    }))
                  }
                />
                <Input
                  placeholder="Question text"
                  value={form.question_text}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, question_text: e.target.value }))
                  }
                />
                {form.question_type === "mcq" && (
                  <>
                    <div className="form-grid-2">
                      <Input
                        placeholder="Option A"
                        value={form.option_a}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, option_a: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Option B"
                        value={form.option_b}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, option_b: e.target.value }))
                        }
                      />
                    </div>
                    <Input
                      placeholder="Correct answer (match option text)"
                      value={form.correct_answer}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, correct_answer: e.target.value }))
                      }
                    />
                  </>
                )}
                {form.question_type === "fill_blank" && (
                  <>
                    <Input
                      placeholder="Reference answer (optional, for your notes)"
                      value={form.correct_answer}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, correct_answer: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Fill in the blank is graded manually after students submit.
                    </p>
                  </>
                )}
                {form.question_type === "true_false" && (
                  <Select
                    value={form.correct_answer || "true"}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, correct_answer: v ?? "true" }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {form.question_type === "fill_gap" && (
                  <p className="text-xs text-muted-foreground">
                    Fill-the-gap answers are graded manually after students submit.
                  </p>
                )}
              </div>
              <Button
                className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                disabled={!form.title.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Save Exercise"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        )}

        {exercises?.map((exercise) => (
          <Card key={exercise.id} className="card-shadow">
            <CardContent className="p-4 flex items-start gap-3">
              <Link href={`/admin/exercises/${exercise.id}`} className="flex-1 min-w-0">
                <p className="font-medium text-sm hover:text-emerald-deep">
                  {exercise.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(exercise.start_date), "MMM d")} –{" "}
                  {format(new Date(exercise.end_date), "MMM d")} ·{" "}
                  {exercise.question_count} questions · {exercise.status}
                  {(exercise.submission_count ?? 0) > 0 &&
                    ` · ${exercise.submission_count} submission${exercise.submission_count === 1 ? "" : "s"}`}
                </p>
              </Link>
              <Link href={`/admin/exercises/${exercise.id}/submissions`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1 border-emerald-deep/30 text-emerald-deep"
                >
                  Grade & results
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </Button>
              </Link>
              <Link href={`/admin/exercises/${exercise.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1 border-emerald-deep/30 text-emerald-deep"
                >
                  Questions
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() =>
                  setPendingDelete({ id: exercise.id, title: exercise.title })
                }
                disabled={deleteMutation.isPending}
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
              </Button>
            </CardContent>
          </Card>
        ))}

        {!isLoading && exercises?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No exercises for this marḥalah yet.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete exercise?"
        description={`Are you sure you want to delete "${pendingDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete Exercise"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />

    </AppShell>
  );
}
