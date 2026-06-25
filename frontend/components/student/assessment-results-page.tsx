"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { AssessmentResultsPanel } from "@/components/student/assessment-results-panel";
import { AppShell } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";

export function AssessmentResultsPage({
  kind,
  id,
  backHref,
}: {
  kind: "exercise" | "exam";
  id: number;
  backHref: string;
}) {
  const assessmentQuery = useQuery({
    queryKey: [kind, id],
    queryFn: () =>
      kind === "exercise" ? studentApi.getExercise(id) : studentApi.getExam(id),
  });

  const resultsQuery = useQuery({
    queryKey: [`${kind}-results`, id],
    queryFn: () =>
      kind === "exercise" ? studentApi.getExerciseResults(id) : studentApi.getExamResults(id),
    enabled: Boolean(assessmentQuery.data?.has_submitted),
  });

  const assessment = assessmentQuery.data;
  const results = resultsQuery.data;
  const isLoading = assessmentQuery.isLoading || resultsQuery.isLoading;

  return (
    <AppShell variant="auth">
      <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-border page-inset-x py-3">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1 text-sm text-emerald-deep hover:text-emerald-mid"
        >
          Back to assessments
        </Link>
      </div>

      {isLoading && (
        <div className="page-loading">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!isLoading && assessment && !assessment.has_submitted && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full max-w-lg">
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-xl font-semibold text-emerald-deep">{assessment.title}</p>
              <p className="text-sm text-muted-foreground">
                You have not submitted this {kind} yet.
              </p>
              <Link
                href={backHref}
                className={buttonVariants({
                  className: "bg-emerald-deep hover:bg-emerald-mid text-cream",
                })}
              >
                {kind === "exercise" ? "Take exercise" : "Take exam"}
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && assessment?.has_submitted && results && (
        <AssessmentResultsPanel
          title={assessment.title}
          score={results.score}
          maxScore={results.max_score}
          gradingStatus={results.grading_status}
          answerGrades={results.answer_grades}
        />
      )}

      {!isLoading && assessment?.has_submitted && !results && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="card-shadow w-full max-w-lg">
            <CardContent className="p-8 text-center space-y-3">
              <StatusBadge status="completed" />
              <p className="text-xl font-semibold text-emerald-deep">{assessment.title}</p>
              {assessment.score !== undefined && (
                <p className="text-lg font-medium text-emerald-deep">
                  Score: {assessment.score}/{assessment.max_score}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Detailed results are not available yet.
              </p>
              <Link href="/assessments" className={buttonVariants({ variant: "outline" })}>
                Back to assessments
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
