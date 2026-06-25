"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { adminApi } from "@/lib/api";
import type { CreateQuestionData } from "@/lib/types";
import { buildQuestionPayload, QUESTION_TYPE_LABELS } from "@/lib/exercise-questions";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AdminExerciseWorkflowGuide } from "@/components/admin/admin-exercise-workflow-guide";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons";
import type { QuestionAdmin } from "@/lib/types";

const emptyQuestionForm = (): CreateQuestionData & { option_a: string; option_b: string } => ({
  type: "mcq",
  text: "",
  option_a: "",
  option_b: "",
  correct_answer: "",
  max_score: 1,
});

function questionToForm(q: QuestionAdmin) {
  return {
    type: q.type,
    text: q.text,
    option_a: q.options?.[0] ?? "",
    option_b: q.options?.[1] ?? "",
    correct_answer: q.correct_answer ?? "",
    max_score: q.max_score ?? 1,
  };
}

function formToPayload(form: ReturnType<typeof emptyQuestionForm>): CreateQuestionData {
  return buildQuestionPayload(form);
}

export default function AdminExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const exerciseId = parseInt(id);
  const queryClient = useQueryClient();
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const { data: exercise, isLoading } = useQuery({
    queryKey: ["admin-exercise", exerciseId],
    queryFn: () => adminApi.getExercise(exerciseId),
  });

  const { data: submissions } = useQuery({
    queryKey: ["admin-exercise-submissions", exerciseId],
    queryFn: () => adminApi.getExerciseSubmissions(exerciseId),
    enabled: Boolean(exercise),
  });

  const resetQuestionForm = () => {
    setShowQuestionForm(false);
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm());
  };

  const saveQuestionMutation = useMutation({
    mutationFn: () => {
      const payload = formToPayload(questionForm);
      if (editingQuestionId) {
        return adminApi.updateExerciseQuestion(exerciseId, editingQuestionId, payload);
      }
      return adminApi.addExerciseQuestion(exerciseId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercise", exerciseId] });
      toast.success(editingQuestionId ? "Question updated" : "Question added");
      resetQuestionForm();
    },
    onError: (err: Error) =>
      toast.error(err.message || (editingQuestionId ? "Update failed" : "Failed to add question")),
  });

  const startEditingQuestion = (q: QuestionAdmin) => {
    setEditingQuestionId(q.id);
    setQuestionForm(questionToForm(q));
    setShowQuestionForm(true);
  };

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: number) =>
      adminApi.deleteExerciseQuestion(exerciseId, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercise", exerciseId] });
      setPendingDeleteId(null);
      toast.success("Question deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  const pendingManualGrades =
    submissions?.flatMap((sub) =>
      sub.answer_grades.filter((g) => g.score === null)
    ).length ?? 0;

  return (
    <AppShell variant="admin">
      <PageHeader title={exercise?.title ?? "Exercise"}>
        <Link
          href="/admin/exercises"
          className="inline-flex items-center gap-1 text-sm text-cream/80 hover:text-cream mt-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to exercises
        </Link>
      </PageHeader>

      <div className="page-content">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        )}

        {exercise && (
          <>
            <AdminExerciseWorkflowGuide
              submissionsHref={`/admin/exercises/${exerciseId}/submissions`}
              pendingCount={pendingManualGrades}
            />

            <Card className="card-shadow">
              <CardContent className="p-4 space-y-1">
                <p className="text-sm text-muted-foreground">
                  {format(new Date(exercise.start_date), "MMM d, yyyy")} –{" "}
                  {format(new Date(exercise.end_date), "MMM d, yyyy")}
                </p>
                {exercise.description && (
                  <p className="text-sm">{exercise.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {exercise.questions?.length ?? 0} questions · {exercise.status}
                </p>
              </CardContent>
            </Card>

            <Link href={`/admin/exercises/${exerciseId}/submissions`}>
              <Card className="card-shadow border-emerald-deep/30 bg-emerald-light/20 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-emerald-deep">Grade & post results</p>
                    <p className="text-sm text-muted-foreground">
                      View student answers. Auto-graded scores appear on submit; grade
                      manual answers below to finish results.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-deep">
                      {submissions?.length ?? 0} submitted →
                    </p>
                    {pendingManualGrades > 0 && (
                      <p className="text-xs text-amber-700">
                        {pendingManualGrades} pending grade
                        {pendingManualGrades === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Button
              className="w-full sm:w-auto bg-emerald-deep hover:bg-emerald-mid text-cream gap-2"
              onClick={() => {
                if (showQuestionForm && !editingQuestionId) {
                  resetQuestionForm();
                } else {
                  setEditingQuestionId(null);
                  setQuestionForm(emptyQuestionForm());
                  setShowQuestionForm(true);
                }
              }}
            >
              <HugeiconsIcon icon={Add01Icon} size={18} />
              {showQuestionForm && !editingQuestionId ? "Cancel" : "Add Question"}
            </Button>

            {showQuestionForm && (
              <Card className="card-shadow">
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm font-medium text-emerald-deep">
                    {editingQuestionId ? "Edit question" : "New question"}
                  </p>
                  <div className="space-y-2">
                    <Label>Question type</Label>
                    <QuestionTypePicker
                      value={questionForm.type}
                      onChange={(type) =>
                        setQuestionForm((p) => ({
                          ...p,
                          type,
                          correct_answer: type === "true_false" ? "true" : "",
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Question text</Label>
                    <Textarea
                      value={questionForm.text}
                      onChange={(e) =>
                        setQuestionForm((p) => ({ ...p, text: e.target.value }))
                      }
                      placeholder={
                        questionForm.type === "fill_blank"
                          ? "Use ___ for the blank, e.g. The rule of ___ is..."
                          : "Enter question..."
                      }
                    />
                  </div>

                  {questionForm.type === "mcq" && (
                    <>
                      <div className="form-grid-2">
                        <Input
                          placeholder="Option A"
                          value={questionForm.option_a}
                          onChange={(e) =>
                            setQuestionForm((p) => ({ ...p, option_a: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="Option B"
                          value={questionForm.option_b}
                          onChange={(e) =>
                            setQuestionForm((p) => ({ ...p, option_b: e.target.value }))
                          }
                        />
                      </div>
                      <Input
                        placeholder="Correct answer (match option text)"
                        value={questionForm.correct_answer}
                        onChange={(e) =>
                          setQuestionForm((p) => ({
                            ...p,
                            correct_answer: e.target.value,
                          }))
                        }
                      />
                    </>
                  )}

                  {questionForm.type === "fill_blank" && (
                    <Input
                      placeholder="Correct answer"
                      value={questionForm.correct_answer}
                      onChange={(e) =>
                        setQuestionForm((p) => ({
                          ...p,
                          correct_answer: e.target.value,
                        }))
                      }
                    />
                  )}

                  {questionForm.type === "true_false" && (
                    <Select
                      value={questionForm.correct_answer || "true"}
                      onValueChange={(v) =>
                        setQuestionForm((p) => ({ ...p, correct_answer: v ?? "true" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {questionForm.type === "fill_gap" && (
                    <p className="text-xs text-muted-foreground">
                      Fill-the-gap answers are graded manually after students submit.
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label>Max score</Label>
                    <Input
                      type="number"
                      min={1}
                      value={questionForm.max_score}
                      onChange={(e) =>
                        setQuestionForm((p) => ({
                          ...p,
                          max_score: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-emerald-deep hover:bg-emerald-mid text-cream"
                      disabled={!questionForm.text.trim() || saveQuestionMutation.isPending}
                      onClick={() => saveQuestionMutation.mutate()}
                    >
                      {saveQuestionMutation.isPending
                        ? "Saving..."
                        : editingQuestionId
                          ? "Update Question"
                          : "Save Question"}
                    </Button>
                    {editingQuestionId && (
                      <Button variant="outline" onClick={resetQuestionForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <h2 className="font-semibold text-sm">Questions</h2>
              {exercise.questions?.map((q) => (
                <Card key={q.id} className="card-shadow">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">
                        {QUESTION_TYPE_LABELS[q.type]} · {q.max_score ?? 1} pt
                        {(q.max_score ?? 1) !== 1 ? "s" : ""}
                      </p>
                      <p className="text-sm font-medium">{q.text}</p>
                      {q.type === "mcq" && q.options && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Options: {q.options.join(" · ")}
                        </p>
                      )}
                      {q.correct_answer && q.type !== "fill_gap" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Answer: {q.correct_answer}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditingQuestion(q)}
                      >
                        <HugeiconsIcon icon={Edit02Icon} size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setPendingDeleteId(q.id)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!exercise.questions?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No questions yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete question?"
        description="This question will be removed from the exercise."
        confirmLabel="Delete"
        destructive
        loading={deleteQuestionMutation.isPending}
        onConfirm={() =>
          pendingDeleteId !== null && deleteQuestionMutation.mutate(pendingDeleteId)
        }
      />
    </AppShell>
  );
}
