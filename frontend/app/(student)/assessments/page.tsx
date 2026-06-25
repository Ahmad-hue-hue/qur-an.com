"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function AssessmentsPage() {
  const { data: exercises, isLoading: loadingExercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: studentApi.getExercises,
  });

  const { data: exams, isLoading: loadingExams } = useQuery({
    queryKey: ["exams"],
    queryFn: studentApi.getExams,
  });

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: studentApi.getDashboard,
  });

  const marhalahNumber = dashboard?.current_marhalah.number ?? 1;
  const topicsComplete =
    Boolean(dashboard?.total_topics) &&
    (dashboard?.topics_completed ?? 0) >= (dashboard?.total_topics ?? 0);

  return (
    <AppShell>
      <PageHeader
        title="Assessments"
        subtitle={`Exercises & exams for Marḥalah ${marhalahNumber}`}
      />

      <div className="page-content">
        <Tabs defaultValue="exercises">
          <TabsList className="w-full bg-muted/50">
            <TabsTrigger value="exercises" className="flex-1">
              Exercises
            </TabsTrigger>
            <TabsTrigger value="exams" className="flex-1">
              Exams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exercises" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {exercises?.map((ex) => (
              <Link key={ex.id} href={`/exercises/${ex.id}`}>
                <Card className="card-shadow hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{ex.title}</h3>
                      <StatusBadge status={ex.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ex.question_count} questions ·{" "}
                      {format(new Date(ex.start_date), "MMM d")} –{" "}
                      {format(new Date(ex.end_date), "MMM d, yyyy")}
                    </p>
                    {ex.status === "upcoming" && (
                      <p className="text-xs text-amber-700 mt-2">
                        Opens {format(new Date(ex.start_date), "MMM d, yyyy")}
                      </p>
                    )}
                    {ex.has_submitted && (
                      <>
                        {ex.score !== undefined && (
                          <p className="text-sm font-medium text-emerald-deep mt-2">
                            Score: {ex.score}/{ex.max_score}
                          </p>
                        )}
                        <p className="text-xs text-emerald-deep mt-1">
                          Tap to view your answers and feedback
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
            {!loadingExercises && exercises?.length === 0 && (
              <Card className="card-shadow md:col-span-2">
                <CardContent className="p-6 text-center text-sm text-muted-foreground space-y-1">
                  <p>No exercises for Marḥalah {marhalahNumber} yet.</p>
                  <p className="text-xs">
                    Exercises are assigned per Marḥalah. Ask your instructor to
                    create one for your current stage.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="exams" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {exams?.map((exam) => {
              const canTake =
                exam.status === "open" &&
                exam.question_count > 0 &&
                topicsComplete &&
                !exam.has_submitted;
              const canViewResults = exam.has_submitted;
              const isClickable = canTake || canViewResults;
              const card = (
                <Card
                  className={`card-shadow ${isClickable ? "hover:shadow-md transition-shadow" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{exam.title}</h3>
                      <StatusBadge status={exam.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {exam.duration_minutes} min · {exam.question_count}{" "}
                      questions ·{" "}
                      {format(new Date(exam.start_date), "MMM d")} –{" "}
                      {format(new Date(exam.end_date), "MMM d, yyyy")}
                    </p>
                    {exam.has_submitted && (
                      <>
                        {exam.score !== undefined && (
                          <p className="text-sm font-medium text-emerald-deep mt-2">
                            Score: {exam.score}/{exam.max_score}
                          </p>
                        )}
                        <p className="text-xs text-emerald-deep mt-1">
                          Tap to view your answers and feedback
                        </p>
                      </>
                    )}
                    {exam.status === "open" && !topicsComplete && (
                      <p className="text-xs text-amber-700 mt-2">
                        Complete all topics in this Marḥalah to unlock this exam.
                      </p>
                    )}
                    {exam.status === "open" && exam.question_count === 0 && (
                      <p className="text-xs text-amber-700 mt-2">
                        Waiting for your instructor to add exam questions.
                      </p>
                    )}
                    {exam.status === "upcoming" && (
                      <p className="text-xs text-amber-700 mt-2">
                        Opens {format(new Date(exam.start_date), "MMM d, yyyy")}
                      </p>
                    )}
                    {canTake && (
                      <p className="text-xs text-emerald-deep mt-2 font-medium">
                        Tap to start exam
                      </p>
                    )}
                  </CardContent>
                </Card>
              );

              return isClickable ? (
                <Link key={exam.id} href={`/exams/${exam.id}`}>
                  {card}
                </Link>
              ) : (
                card
              );
            })}
            {!loadingExams && exams?.length === 0 && (
              <Card className="card-shadow md:col-span-2">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No exams for Marḥalah {marhalahNumber} yet.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {dashboard?.halaqah && (
            <Card className="card-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Halaqah (Oral Test)</p>
                  <p className="text-xs text-muted-foreground">
                    Marks added manually by instructor
                  </p>
                </div>
                <span className="font-medium">
                  {dashboard.halaqah.score}/{dashboard.halaqah.max_score}
                </span>
              </CardContent>
            </Card>
          )}
          {dashboard?.tadreeb && (
            <Card className="card-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Tadreeb (Practice)</p>
                  <p className="text-xs text-muted-foreground">
                    Marks added manually by instructor
                  </p>
                </div>
                <span className="font-medium">
                  {dashboard.tadreeb.score}/{dashboard.tadreeb.max_score}
                </span>
              </CardContent>
            </Card>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6 px-4">
          You must complete all topics in this Marḥalah to unlock the final exam.
        </p>
      </div>

    </AppShell>
  );
}
