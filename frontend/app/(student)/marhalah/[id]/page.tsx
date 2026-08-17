"use client";

import { use, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TopicList } from "@/components/student/topic-list";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon } from "@hugeicons/core-free-icons";

export default function MarhalahTopicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const marhalahId = parseInt(id);
  const queryClient = useQueryClient();

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

  useEffect(() => {
    if (exam) {
      queryClient.setQueryData(["exam", exam.id], exam);
    }
  }, [exam, queryClient]);

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
              <Card className="card-shadow mt-4">
                <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium">Final exam</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {exam.question_count} questions · {exam.duration_minutes}{" "}
                      min
                    </p>
                  </div>
                  {exam.status === "open" && !exam.has_submitted ? (
                    <Link
                      href={`/exams/${exam.id}`}
                      className={buttonVariants({
                        className: "btn-emerald w-full sm:w-auto",
                      })}
                    >
                      Start
                    </Link>
                  ) : exam.has_submitted ? (
                    <Link
                      href={`/exams/${exam.id}/results`}
                      className={buttonVariants({
                        variant: "outline",
                        className: "w-full sm:w-auto",
                      })}
                    >
                      Results
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not open yet</p>
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
