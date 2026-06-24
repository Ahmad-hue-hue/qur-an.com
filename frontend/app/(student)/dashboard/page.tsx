"use client";

import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressCard } from "@/components/student/progress-card";
import { MarhalahList } from "@/components/student/marhalah-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: studentApi.getDashboard,
  });

  return (
    <AppShell>
      {isLoading && (
        <>
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="p-4 space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </>
      )}

      {!isLoading && data && (
        <>
          <PageHeader title={data.greeting}>
            <p className="text-cream/80 text-sm mt-2">
              Reg No:{" "}
              <span className="text-gold font-medium">
                {data.registration_number || "Pending Assignment"}
              </span>
            </p>
          </PageHeader>

          <ProgressCard
            marhalahTitle={data.current_marhalah.title}
            progressPercent={data.progress_percent}
            topicsCompleted={data.topics_completed}
            totalTopics={data.total_topics}
            nextTopic={data.next_topic?.title}
          />

          <div className="page-content">
            <section>
              <h2 className="text-sm font-semibold text-emerald-deep mb-3">
                Marḥalah Stages
              </h2>
              <MarhalahList marhalahs={data.marhalahs} />
            </section>

            <section>
              <h2 className="text-sm font-semibold text-emerald-deep mb-3">
                Assessments
              </h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {data.exercises.map((ex) => (
                  <Link key={ex.id} href={`/exercises/${ex.id}`}>
                    <Card className="card-shadow hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{ex.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ex.question_count} questions
                          </p>
                        </div>
                        <StatusBadge status={ex.status} />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {data.exams.map((exam) => (
                  <Card key={exam.id} className="card-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {exam.duration_minutes} min · {exam.question_count} questions
                        </p>
                      </div>
                      <StatusBadge status={exam.status} />
                    </CardContent>
                  </Card>
                ))}
                {data.halaqah && (
                  <Card className="card-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <p className="font-medium text-sm">Halaqah (Oral Test)</p>
                      <span className="text-sm text-muted-foreground">
                        {data.halaqah.score}/{data.halaqah.max_score}
                      </span>
                    </CardContent>
                  </Card>
                )}
                {data.tadreeb && (
                  <Card className="card-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <p className="font-medium text-sm">Tadreeb (Practice)</p>
                      <span className="text-sm text-muted-foreground">
                        {data.tadreeb.score}/{data.tadreeb.max_score}
                      </span>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-emerald-deep mb-3">
                Recent Results
              </h2>
              <Card className="card-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.recent_results.exercises.map((r, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{r.title}</span>
                      <span className="font-medium">
                        {r.score}/{r.max_score}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="font-medium">Overall Average</span>
                    <span className="font-bold text-gold">
                      {data.recent_results.overall_average}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </>
      )}

    </AppShell>
  );
}
