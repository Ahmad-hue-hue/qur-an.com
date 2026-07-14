"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TopicList } from "@/components/student/topic-list";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon } from "@hugeicons/core-free-icons";

export default function MarhalahTopicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const marhalahId = parseInt(id);

  const { data: marhalahs } = useQuery({
    queryKey: ["marhalahs"],
    queryFn: studentApi.getMarhalahs,
  });

  const { data: topics, isLoading, isError, error } = useQuery({
    queryKey: ["topics", marhalahId],
    queryFn: () => studentApi.getTopics(marhalahId),
  });

  const marhalah = marhalahs?.find((m) => m.id === marhalahId);
  const completed = topics?.filter((t) => t.is_completed).length ?? 0;
  const total = topics?.length ?? 0;
  const allLessonsComplete = total > 0 && completed === total;

  const { data: exam } = useQuery({
    queryKey: ["marhalah-exam", marhalahId],
    queryFn: () => studentApi.getMarhalahExam(marhalahId),
    enabled: allLessonsComplete,
  });

  return (
    <AppShell>
      <PageHeader
        title={marhalah?.title || `Marḥalah ${id}`}
        subtitle={`${completed}/${total} Completed`}
      >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2 hover:text-cream"
          >
            <HugeiconsIcon icon={Home01Icon} size={16} />
            Back to Home
          </Link>
      </PageHeader>

      <div className="page-content">
        {isError ? (
          <Card className="card-shadow">
            <CardContent className="p-6 text-center space-y-3">
              <p className="font-medium text-emerald-deep">Marḥalah locked</p>
              <p className="text-sm text-muted-foreground">
                {(error as Error).message ||
                  "Lessons in this Marḥalah unlock when an admin unlocks each lesson."}
              </p>
              <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                Back to Home
              </Link>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <TopicList topics={topics || []} />
            {allLessonsComplete && exam && (
              <Card className="card-shadow mt-4 border-emerald-deep/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-deep">
                        Final Marḥalah Exam
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {exam.question_count} questions · {exam.duration_minutes} min
                      </p>
                    </div>
                    <StatusBadge status={exam.status} />
                  </div>
                  {exam.status === "open" && !exam.has_submitted ? (
                    <Link
                      href={`/exams/${exam.id}`}
                      className={buttonVariants({ className: "w-full btn-emerald" })}
                    >
                      Start exam
                    </Link>
                  ) : exam.has_submitted ? (
                    <Link
                      href={`/exams/${exam.id}/results`}
                      className={buttonVariants({ variant: "outline", className: "w-full" })}
                    >
                      View exam results
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      The exam is not open yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

    </AppShell>
  );
}
