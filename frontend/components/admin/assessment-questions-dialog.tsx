"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { CreateQuestionData, QuestionAdmin } from "@/lib/types";
import { buildQuestionPayload, QUESTION_TYPE_LABELS } from "@/lib/exercise-questions";
import { QuestionTypePicker } from "@/components/admin/question-type-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";

type AssessmentKind = "exercise" | "exam";
type DialogMode = "list" | "edit" | "add";

const emptyQuestionForm = (): CreateQuestionData & {
  option_a: string;
  option_b: string;
} => ({
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

function QuestionFormFields({
  questionForm,
  setQuestionForm,
}: {
  questionForm: ReturnType<typeof emptyQuestionForm>;
  setQuestionForm: React.Dispatch<
    React.SetStateAction<ReturnType<typeof emptyQuestionForm>>
  >;
}) {
  return (
    <div className="space-y-4">
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
        <>
          <Input
            placeholder="Reference answer (optional, for your notes)"
            value={questionForm.correct_answer}
            onChange={(e) =>
              setQuestionForm((p) => ({
                ...p,
                correct_answer: e.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Fill in the blank is graded manually after students submit.
          </p>
        </>
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
    </div>
  );
}

export function AssessmentQuestionsDialog({
  kind,
  assessmentId,
  assessmentTitle,
  open,
  onOpenChange,
}: {
  kind: AssessmentKind;
  assessmentId: number;
  assessmentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<DialogMode>("list");
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const detailKey =
    kind === "exercise"
      ? ["admin-exercise", assessmentId]
      : ["admin-exam", assessmentId];

  const { data: assessment, isLoading } = useQuery({
    queryKey: detailKey,
    queryFn: () =>
      kind === "exercise"
        ? adminApi.getExercise(assessmentId)
        : adminApi.getExam(assessmentId),
    enabled: open && assessmentId > 0,
  });

  const questions = assessment?.questions ?? [];

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode("list");
      setEditingQuestionId(null);
      setQuestionForm(emptyQuestionForm());
      setPendingDeleteId(null);
    }
    onOpenChange(next);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: detailKey });
    queryClient.invalidateQueries({
      queryKey: kind === "exercise" ? ["admin-exercises"] : ["admin-exams"],
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildQuestionPayload(questionForm);
      if (mode === "edit" && editingQuestionId) {
        return kind === "exercise"
          ? adminApi.updateExerciseQuestion(assessmentId, editingQuestionId, payload)
          : adminApi.updateExamQuestion(assessmentId, editingQuestionId, payload);
      }
      return kind === "exercise"
        ? adminApi.addExerciseQuestion(assessmentId, payload)
        : adminApi.addExamQuestion(assessmentId, payload);
    },
    onSuccess: () => {
      invalidate();
      toast.success(mode === "edit" ? "Question updated" : "Question added");
      setMode("list");
      setEditingQuestionId(null);
      setQuestionForm(emptyQuestionForm());
    },
    onError: (err: Error) => toast.error(err.message || "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (questionId: number) =>
      kind === "exercise"
        ? adminApi.deleteExerciseQuestion(assessmentId, questionId)
        : adminApi.deleteExamQuestion(assessmentId, questionId),
    onSuccess: () => {
      invalidate();
      setPendingDeleteId(null);
      toast.success("Question deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  const startEdit = (q: QuestionAdmin) => {
    setEditingQuestionId(q.id);
    setQuestionForm(questionToForm(q));
    setMode("edit");
  };

  const startAdd = () => {
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm());
    setMode("add");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-deep">
              {mode === "list"
                ? assessmentTitle
                : mode === "add"
                  ? "Add question"
                  : "Edit question"}
            </DialogTitle>
            {mode === "list" && (
              <DialogDescription>
                Tap a question to edit it directly.
              </DialogDescription>
            )}
          </DialogHeader>

          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Loading questions...
            </p>
          )}

          {!isLoading && mode === "list" && (
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-emerald-deep/30 text-emerald-deep"
                onClick={startAdd}
              >
                <HugeiconsIcon icon={Add01Icon} size={16} />
                Add question
              </Button>

              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No questions yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-2 rounded-xl border border-border p-3"
                    >
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => startEdit(q)}
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          Question {index + 1} · {QUESTION_TYPE_LABELS[q.type]}
                        </p>
                        <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        aria-label="Delete question"
                        onClick={() => setPendingDeleteId(q.id)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isLoading && (mode === "edit" || mode === "add") && (
            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 -ml-2 text-emerald-deep"
                onClick={() => {
                  setMode("list");
                  setEditingQuestionId(null);
                  setQuestionForm(emptyQuestionForm());
                }}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                Back to questions
              </Button>

              <QuestionFormFields
                questionForm={questionForm}
                setQuestionForm={setQuestionForm}
              />

              <Button
                type="button"
                className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                disabled={!questionForm.text.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : mode === "edit"
                    ? "Save changes"
                    : "Add question"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(next) => !next && setPendingDeleteId(null)}
        title="Delete question?"
        description="This question will be removed from the assessment."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() =>
          pendingDeleteId !== null && deleteMutation.mutate(pendingDeleteId)
        }
      />
    </>
  );
}
