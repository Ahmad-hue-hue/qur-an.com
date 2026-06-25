"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { ExerciseSubmissionAdmin, ExamSubmissionAdmin, QuestionAdmin } from "@/lib/types";
import {
  ExerciseGradingGuide,
  ExerciseSubmissionsPanel,
} from "@/components/admin/exercise-submissions-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AssessmentKind = "exercise" | "exam";

type SubmissionRow = ExerciseSubmissionAdmin | ExamSubmissionAdmin;

export function AssessmentSubmissionsView({
  kind,
  assessmentId,
  title,
  questions,
}: {
  kind: AssessmentKind;
  assessmentId: number;
  title: string;
  questions?: QuestionAdmin[];
}) {
  const queryClient = useQueryClient();
  const submissionsKey =
    kind === "exercise"
      ? ["admin-exercise-submissions", assessmentId]
      : ["admin-exam-submissions", assessmentId];

  const { data: submissions, isLoading } = useQuery<SubmissionRow[]>({
    queryKey: submissionsKey,
    queryFn: () =>
      kind === "exercise"
        ? adminApi.getExerciseSubmissions(assessmentId)
        : adminApi.getExamSubmissions(assessmentId),
  });

  const gradeMutation = useMutation({
    mutationFn: ({
      gradeId,
      score,
      feedback,
    }: {
      gradeId: number;
      score: number;
      feedback: string;
    }) =>
      kind === "exercise"
        ? adminApi.gradeExerciseAnswer(gradeId, { score, feedback })
        : adminApi.gradeExamAnswer(gradeId, { score, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionsKey });
      toast.success("Answer graded");
    },
    onError: (err: Error) => toast.error(err.message || "Grading failed"),
  });

  const pendingGrades =
    submissions?.flatMap((sub: SubmissionRow) =>
      sub.answer_grades
        .filter((g) => g.score === null)
        .map((g) => ({ ...g, submission: sub }))
    ) ?? [];

  return (
    <div className="space-y-4">
      <Card className="card-shadow border-emerald-deep/20 bg-emerald-light/10">
        <CardContent className="p-4 space-y-2">
          <p className="font-medium text-emerald-deep">{title}</p>
          <p className="text-sm text-muted-foreground">
            MCQ, True/False, and Fill blank are graded automatically when a student
            submits. Results appear on the student app right away — no publish button.
          </p>
          <p className="text-sm text-muted-foreground">
            For Fill the gap and Written questions, enter a score and optional feedback
            in Manual grading below, then tap Save grade. The student&apos;s total score
            updates immediately.
          </p>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">Loading submissions...</p>
      )}

      <ExerciseGradingGuide />

      <ExerciseSubmissionsPanel submissions={submissions} questions={questions} />

      <div className="space-y-2">
        <h2 className="font-semibold text-sm">
          Manual grading
          {pendingGrades.length > 0 && (
            <span className="ml-2 text-xs font-normal text-amber-600">
              {pendingGrades.length} pending
            </span>
          )}
        </h2>

        {pendingGrades.map((grade) => (
          <ManualGradeCard
            key={grade.id}
            grade={grade}
            isPending={gradeMutation.isPending}
            onSave={(score, feedback) =>
              gradeMutation.mutate({ gradeId: grade.id, score, feedback })
            }
          />
        ))}

        {!isLoading && !pendingGrades.length && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No answers waiting for manual grading.
          </p>
        )}
      </div>
    </div>
  );
}

function ManualGradeCard({
  grade,
  isPending,
  onSave,
}: {
  grade: {
    id: number;
    question_text: string;
    answer_text: string;
    max_score: number;
    submission: SubmissionRow;
  };
  isPending: boolean;
  onSave: (score: number, feedback: string) => void;
}) {
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  return (
    <Card className="card-shadow border-amber-200/60">
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {grade.submission.student_name} ·{" "}
            {format(new Date(grade.submission.submitted_at), "MMM d, h:mm a")}
          </p>
          <p className="text-sm font-medium mt-1">{grade.question_text}</p>
          <p className="text-sm mt-2 bg-muted/50 rounded-lg p-3">
            {grade.answer_text || "(no answer)"}
          </p>
        </div>
        <div className="form-grid-2">
          <div className="space-y-1">
            <Label className="text-xs">Score (max {grade.max_score})</Label>
            <Input
              type="number"
              min={0}
              max={grade.max_score}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Feedback (optional)</Label>
            <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </div>
        </div>
        <Button
          size="sm"
          className="bg-emerald-deep hover:bg-emerald-mid text-cream"
          disabled={score === "" || isPending}
          onClick={() => onSave(parseFloat(score), feedback)}
        >
          Save grade
        </Button>
      </CardContent>
    </Card>
  );
}
