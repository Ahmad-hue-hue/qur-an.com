"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    title: "Create the exercise",
    body: "Assessments → Create Exercise. Set title, Marḥalah, start date, and end date. Students only see exercises for their current Marḥalah.",
  },
  {
    title: "Add questions",
    body: "Open Manage and add questions. For MCQ, True/False, and Fill blank, set the correct answer so the system can auto-grade.",
  },
  {
    title: "Students complete it",
    body: "When the start date arrives, the exercise appears on the student Assessments page. They submit answers before the end date.",
  },
  {
    title: "Results go out automatically",
    body: "Auto-graded questions show scores immediately after submit. There is no separate “publish results” button.",
  },
  {
    title: "Grade manual answers (if any)",
    body: "Open Submissions → Manual grading for Fill the gap or Written questions. Enter score + feedback and tap Save grade.",
  },
  {
    title: "Students view feedback",
    body: "Students open Assessments → Results or Review exercise to see scores, correct answers, and your feedback.",
  },
] as const;

export function AdminExerciseWorkflowGuide({
  submissionsHref,
  pendingCount,
}: {
  submissionsHref?: string;
  pendingCount?: number;
}) {
  return (
    <Card className="card-shadow border-emerald-deep/25 bg-emerald-light/20">
      <CardContent className="p-4 space-y-4">
        <div>
          <p className="font-semibold text-emerald-deep">How exercises & results work</p>
          <p className="text-sm text-muted-foreground mt-1">
            Follow these steps from creating an exercise to students seeing their results.
          </p>
          {pendingCount != null && pendingCount > 0 && submissionsHref && (
            <p className="text-sm text-amber-800 mt-2">
              {pendingCount} answer{pendingCount === 1 ? "" : "s"} still need manual grading
              before final scores are complete.{" "}
              <Link href={submissionsHref} className="underline font-medium">
                Grade now →
              </Link>
            </p>
          )}
        </div>

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-deep text-xs font-semibold text-cream">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-emerald-deep">{step.title}</p>
                <p className="text-muted-foreground mt-0.5">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
