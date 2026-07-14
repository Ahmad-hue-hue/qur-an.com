"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import type { ExerciseSubmissionAdmin, ExamSubmissionAdmin } from "@/lib/types";
import { ExerciseSubmissionsPanel } from "@/components/admin/exercise-submissions-panel";
import { Card, CardContent } from "@/components/ui/card";

type AssessmentKind = "exercise" | "exam";

type SubmissionRow = ExerciseSubmissionAdmin | ExamSubmissionAdmin;

type SubmissionsApi = Pick<
  typeof adminApi,
  "getExerciseSubmissions" | "getExamSubmissions"
>;

const defaultApi: SubmissionsApi = adminApi;

export function AssessmentSubmissionsView({
  kind,
  assessmentId,
  title,
  api = defaultApi,
  cachePrefix = "admin",
}: {
  kind: AssessmentKind;
  assessmentId: number;
  title: string;
  api?: SubmissionsApi;
  cachePrefix?: "admin" | "teacher";
}) {
  const submissionsKey =
    kind === "exercise"
      ? [`${cachePrefix}-exercise-submissions`, assessmentId]
      : [`${cachePrefix}-exam-submissions`, assessmentId];

  const { data: submissions, isLoading } = useQuery<SubmissionRow[]>({
    queryKey: submissionsKey,
    queryFn: async () =>
      kind === "exercise"
        ? api.getExerciseSubmissions(assessmentId)
        : api.getExamSubmissions(assessmentId),
  });

  return (
    <div className="space-y-4">
      <Card className="card-shadow border-emerald-deep/20 bg-emerald-light/10">
        <CardContent className="p-4 space-y-2">
          <p className="font-medium text-emerald-deep">{title}</p>
          <p className="text-sm text-muted-foreground">
            MCQ and True/False are graded automatically. Marks per question are
            set by the admin; the total is the sum of all question marks.
          </p>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Loading submissions...
        </p>
      )}

      {!isLoading && (
        <ExerciseSubmissionsPanel
          submissions={submissions?.map((submission) => ({
            id: submission.id,
            student_name: submission.student_name,
            student_phone: submission.student_phone,
            score: submission.score,
            max_score: submission.max_score,
            submitted_at: submission.submitted_at,
          }))}
        />
      )}
    </div>
  );
}
