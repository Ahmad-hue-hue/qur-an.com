"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { CreateQuestionData, QuestionAdmin } from "@/lib/types";
import { EXAM_QUESTION_TYPES, EXERCISE_QUESTION_TYPES, buildQuestionPayload, QUESTION_TYPE_LABELS } from "@/lib/exercise-questions";
import { formatQuestionMark, totalQuestionMarks } from "@/lib/assessment-mark";
import { marksInputValue, normalizeQuestionMarks } from "@/lib/question-marks";
import type { QuestionType } from "@/lib/types";
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
  option_c: string;
  marks: string;
} => ({
  type: "mcq",
  text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  correct_answer: "",
  marks: "1",
});

function questionToForm(q: QuestionAdmin) {
  return {
    type: q.type,
    text: q.text,
    option_a: q.options?.[0] ?? "",
    option_b: q.options?.[1] ?? "",
    option_c: q.options?.[2] ?? "",
    correct_answer: q.correct_answer ?? "",
    marks: marksInputValue(q.max_score),
  };
}

function QuestionFormFields({
  questionForm,
  setQuestionForm,
  allowedTypes,
}: {
  questionForm: ReturnType<typeof emptyQuestionForm>;
  setQuestionForm: React.Dispatch<
    React.SetStateAction<ReturnType<typeof emptyQuestionForm>>
  >;
  allowedTypes?: QuestionType[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question type</Label>
        <QuestionTypePicker
          value={questionForm.type}
          allowedTypes={allowedTypes}
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
        <Label>Marks for this question</Label>
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          value={questionForm.marks}
          onChange={(e) =>
            setQuestionForm((p) => ({
              ...p,
              marks: e.target.value,
            }))
          }
          onBlur={() =>
            setQuestionForm((p) => ({
              ...p,
              marks: marksInputValue(p.marks),
            }))
          }
        />
        <p className="text-xs text-muted-foreground">
          How many marks a correct answer earns. Example: set 5 for a harder
          question. Total score is the sum of all question marks.
        </p>
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
            placeholder="Option C"
            value={questionForm.option_c}
            onChange={(e) =>
              setQuestionForm((p) => ({ ...p, option_c: e.target.value }))
            }
          />
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
    </div>
  );
}

type QuestionsApi = Pick<
  typeof adminApi,
  | "getExercise"
  | "getExam"
  | "addExerciseQuestion"
  | "addExamQuestion"
  | "updateExerciseQuestion"
  | "updateExamQuestion"
  | "deleteExerciseQuestion"
  | "deleteExamQuestion"
>;

export function AssessmentQuestionsDialog({
  kind,
  assessmentId,
  assessmentTitle,
  open,
  onOpenChange,
  api = adminApi,
  cachePrefix = "admin",
  allowedTypes,
}: {
  kind: AssessmentKind;
  assessmentId: number;
  assessmentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api?: QuestionsApi;
  cachePrefix?: "admin" | "teacher";
  allowedTypes?: QuestionType[];
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<DialogMode>("list");
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const detailKey =
    kind === "exercise"
      ? [`${cachePrefix}-exercise`, assessmentId]
      : [`${cachePrefix}-exam`, assessmentId];

  const { data: assessment, isLoading } = useQuery({
    queryKey: detailKey,
    queryFn: () =>
      kind === "exercise"
        ? api.getExercise(assessmentId)
        : api.getExam(assessmentId),
    enabled: open && assessmentId > 0,
  });

  const questions = assessment?.questions ?? [];
  const resolvedAllowedTypes =
    allowedTypes ??
    (kind === "exam"
      ? EXAM_QUESTION_TYPES.map((entry) => entry.value)
      : EXERCISE_QUESTION_TYPES.map((entry) => entry.value));

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
      queryKey: kind === "exercise" ? [`${cachePrefix}-exercises`] : [`${cachePrefix}-exams`],
    });
    if (kind === "exercise") {
      queryClient.invalidateQueries({ queryKey: ["admin-topic"] });
      queryClient.invalidateQueries({ queryKey: [`${cachePrefix}-exercise-submissions`, assessmentId] });
    } else {
      queryClient.invalidateQueries({ queryKey: [`${cachePrefix}-exam-submissions`, assessmentId] });
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildQuestionPayload({
        type: questionForm.type,
        text: questionForm.text,
        arabic_text: questionForm.arabic_text,
        option_a: questionForm.option_a,
        option_b: questionForm.option_b,
        option_c: questionForm.option_c,
        correct_answer: questionForm.correct_answer,
        max_score: normalizeQuestionMarks(questionForm.marks),
      });
      if (mode === "edit" && editingQuestionId) {
        return kind === "exercise"
          ? api.updateExerciseQuestion(assessmentId, editingQuestionId, payload)
          : api.updateExamQuestion(assessmentId, editingQuestionId, payload);
      }
      return kind === "exercise"
        ? api.addExerciseQuestion(assessmentId, payload)
        : api.addExamQuestion(assessmentId, payload);
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
        ? api.deleteExerciseQuestion(assessmentId, questionId)
        : api.deleteExamQuestion(assessmentId, questionId),
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
              {questions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {questions.length} question{questions.length === 1 ? "" : "s"} ·{" "}
                  {totalQuestionMarks(questions)} marks total
                </p>
              )}
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
                          Question {index + 1} · {QUESTION_TYPE_LABELS[q.type]} ·{" "}
                          {formatQuestionMark(q.max_score)}
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
                allowedTypes={resolvedAllowedTypes}
              />

              <Button
                type="button"
                className="w-full btn-emerald"
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
