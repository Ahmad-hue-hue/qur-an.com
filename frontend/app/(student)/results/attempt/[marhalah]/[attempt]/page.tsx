"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { AssessmentResultsPanel } from "@/components/student/assessment-results-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon } from "@hugeicons/core-free-icons";

export default function AttemptReviewPage({
  params,
}: {
  params: Promise<{ marhalah: string; attempt: string }>;
}) {
  const { marhalah, attempt } = use(params);
  const marhalahNumber = parseInt(marhalah);
  const attemptNumber = parseInt(attempt);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: studentApi.getProfile,
  });

  const { data: review, isLoading } = useQuery({
    queryKey: ["attempt-review", marhalahNumber, attemptNumber],
    queryFn: () => studentApi.getAttemptReview(marhalahNumber, attemptNumber),
  });

  return (
    <AppShell variant="auth">
      <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-border page-inset-x py-3">
        <Link
          href="/results"
          className="inline-flex items-center gap-1 text-sm text-emerald-deep hover:text-emerald-mid"
        >
          <HugeiconsIcon icon={Home01Icon} size={16} />
          Back to results
        </Link>
      </div>

      <PageHeader
        title={`Attempt ${attemptNumber} review`}
        subtitle={`Marḥalah ${marhalahNumber}`}
      />

      {isLoading && (
        <div className="page-loading">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!isLoading && review && (
        <div className="page-content space-y-8 max-w-lg mx-auto">
          {review.halaqah || review.tadreeb ? (
            <Card className="card-shadow">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-emerald-deep">
                  Ḥalaqah &amp; Tadreeb
                </p>
                {review.halaqah && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ḥalaqah</span>
                    <span className="font-medium">
                      {review.halaqah.score}/{review.halaqah.max_score}
                    </span>
                  </div>
                )}
                {review.tadreeb && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tadreeb</span>
                    <span className="font-medium">
                      {review.tadreeb.score}/{review.tadreeb.max_score}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1 border-t">
                  <span className="text-muted-foreground">Topics completed</span>
                  <span className="font-medium">
                    {review.topics_completed}/{review.topics_total}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {review.exercises.length === 0 && !review.exam && (
            <Card className="card-shadow">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No exercise or exam answers were preserved for this attempt.
              </CardContent>
            </Card>
          )}

          {review.exercises.map((ex) => (
            <div key={ex.id} className="border-t border-border pt-6 first:border-0 first:pt-0">
              <AssessmentResultsPanel
                title={ex.title}
                score={ex.score ?? 0}
                maxScore={ex.max_score ?? 0}
                answerGrades={ex.answer_grades}
                phone={profile?.phone}
              />
            </div>
          ))}

          {review.exam && (
            <div className="border-t border-border pt-6">
              <AssessmentResultsPanel
                title={review.exam.title}
                score={review.exam.score ?? 0}
                maxScore={review.exam.max_score ?? 0}
                answerGrades={review.exam.answer_grades}
                phone={profile?.phone}
              />
            </div>
          )}

          <div className="text-center pb-6">
            <Link href="/results" className={buttonVariants({ variant: "outline" })}>
              Back to results
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
