"use client";

import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressCard } from "@/components/student/progress-card";
import { MarhalahList } from "@/components/student/marhalah-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: studentApi.getDashboard,
  });

  return (
    <AppShell>
      {isLoading && (
        <>
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="page-loading">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </>
      )}

      {isError && (
        <div className="page-content">
          <Card className="card-shadow">
            <CardContent className="p-6 text-center space-y-2">
              <p className="font-medium text-emerald-deep">Could not load dashboard</p>
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message || "Please try again."}
              </p>
            </CardContent>
          </Card>
        </div>
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
              <h2 className="section-title">Marḥalah Stages</h2>
              <MarhalahList marhalahs={data.marhalahs} />
            </section>

            <section>
              <h2 className="section-title">Recent Results</h2>
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
                  {data.recent_results.exam && (
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">
                        {data.recent_results.exam.title}
                      </span>
                      <span className="font-medium">
                        {data.recent_results.exam.score}/
                        {data.recent_results.exam.max_score}
                      </span>
                    </div>
                  )}
                  {data.halaqah && (
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Ḥalaqah</span>
                      <span className="font-medium">
                        {data.halaqah.score}/{data.halaqah.max_score}
                      </span>
                    </div>
                  )}
                  {data.tadreeb && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tadreeb</span>
                      <span className="font-medium">
                        {data.tadreeb.score}/{data.tadreeb.max_score}
                      </span>
                    </div>
                  )}
                  {!data.recent_results.exercises.length &&
                    !data.recent_results.exam &&
                    !data.halaqah &&
                    !data.tadreeb && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No results yet.
                      </p>
                    )}
                </CardContent>
              </Card>
            </section>
          </div>
        </>
      )}

    </AppShell>
  );
}
