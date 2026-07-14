"use client";

import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { formatAssessmentMark } from "@/lib/assessment-mark";
import type { ExamSubmissionAdmin, ExerciseSubmissionAdmin } from "@/lib/types";

type MarkRow = Pick<
  ExerciseSubmissionAdmin | ExamSubmissionAdmin,
  "id" | "student_name" | "student_phone" | "score" | "max_score" | "submitted_at"
>;

export function AssessmentMarksPanel({
  kind,
  assessmentId,
}: {
  kind: "exercise" | "exam";
  assessmentId: number;
}) {
  const exerciseQuery = useQuery({
    queryKey: ["admin-exercise-submissions", assessmentId],
    queryFn: () => adminApi.getExerciseSubmissions(assessmentId),
    enabled: kind === "exercise",
  });

  const examQuery = useQuery({
    queryKey: ["admin-exam-submissions", assessmentId],
    queryFn: () => adminApi.getExamSubmissions(assessmentId),
    enabled: kind === "exam",
  });

  const submissions: MarkRow[] | undefined =
    kind === "exercise" ? exerciseQuery.data : examQuery.data;
  const isLoading =
    kind === "exercise" ? exerciseQuery.isLoading : examQuery.isLoading;

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading marks...</p>;
  }

  if (!submissions?.length) {
    return (
      <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
        No submissions yet
      </p>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border/50">
      <p className="text-xs text-muted-foreground">
        {submissions.length} submission{submissions.length === 1 ? "" : "s"}
      </p>
      <div className="space-y-1.5">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="min-w-0">
              <p className="font-mono text-sm truncate">
                {submission.student_phone || submission.student_name || "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {format(new Date(submission.submitted_at), "MMM d · h:mm a")}
              </p>
            </div>
            <p className="shrink-0 font-medium tabular-nums">
              {formatAssessmentMark(submission.score, submission.max_score)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
