"use client";

import { format } from "date-fns";
import type { ExerciseSubmissionAdmin } from "@/lib/types";
import { formatAssessmentMark } from "@/lib/assessment-mark";
import { Card, CardContent } from "@/components/ui/card";

type SubmissionRow = Pick<
  ExerciseSubmissionAdmin,
  "id" | "student_name" | "student_phone" | "score" | "max_score" | "submitted_at"
>;

export function ExerciseSubmissionsPanel({
  submissions,
}: {
  submissions?: SubmissionRow[];
}) {
  if (!submissions?.length) {
    return (
      <div className="space-y-2 pt-2">
        <h2 className="font-semibold text-sm">Student marks</h2>
        <Card className="card-shadow">
          <CardContent className="p-4 text-sm text-muted-foreground text-center">
            No submissions yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <h2 className="font-semibold text-sm">
        Student marks ({submissions.length})
      </h2>

      {submissions.map((submission) => (
        <Card key={submission.id} className="card-shadow">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium font-mono">
                {submission.student_phone || submission.student_name || "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Submitted{" "}
                {format(new Date(submission.submitted_at), "MMM d, yyyy · h:mm a")}
              </p>
            </div>
            <p className="text-lg font-semibold text-emerald-deep">
              {formatAssessmentMark(submission.score, submission.max_score)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
