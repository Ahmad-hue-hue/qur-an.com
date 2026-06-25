"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
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
              <Card key={ex.id} className="card-shadow">
                <CardContent className="p-4 space-y-3">
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
                    <p className="text-xs text-amber-700">
                      Opens {format(new Date(ex.start_date), "MMM d, yyyy")}
                    </p>
                  )}
                  {ex.has_submitted && ex.marhalah !== marhalahNumber && (
                    <p className="text-xs text-muted-foreground">
                      Marḥalah {ex.marhalah} · submitted exercise
                    </p>
                  )}
                  {ex.status === "expired" && !ex.has_submitted && (
                    <p className="text-xs text-red-700">
                      Closed {format(new Date(ex.end_date), "MMM d, yyyy")} — not submitted in time
                    </p>
                  )}
                  {ex.has_submitted && ex.score !== undefined && (
                    <p className="text-sm font-medium text-emerald-deep">
                      Score: {ex.score}/{ex.max_score}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    {ex.has_submitted ? (
                      <>
                        <Link
                          href={`/exercises/${ex.id}/review`}
                          className={buttonVariants({
                            className: "flex-1 bg-emerald-deep hover:bg-emerald-mid text-cream",
                          })}
                        >
                          Review exercise
                        </Link>
                        <Link
                          href={`/exercises/${ex.id}/results`}
                          className={buttonVariants({ variant: "outline", className: "flex-1" })}
                        >
                          Results
                        </Link>
                      </>
                    ) : ex.status === "open" && ex.question_count > 0 ? (
                      <Link
                        href={`/exercises/${ex.id}`}
                        className={buttonVariants({
                          className: "flex-1 bg-emerald-deep hover:bg-emerald-mid text-cream",
                        })}
                      >
                        Start exercise
                      </Link>
                    ) : ex.status === "expired" && !ex.has_submitted ? (
                      <Link
                        href={`/exercises/${ex.id}/review`}
                        className={buttonVariants({
                          className: "flex-1 bg-emerald-deep hover:bg-emerald-mid text-cream",
                        })}
                      >
                        Review questions
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
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
              const card = (
                <Card className="card-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{exam.title}</h3>
                      <StatusBadge status={exam.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {exam.duration_minutes} min · {exam.question_count}{" "}
                      questions ·{" "}
                      {format(new Date(exam.start_date), "MMM d")} –{" "}
                      {format(new Date(exam.end_date), "MMM d, yyyy")}
                    </p>
                    {exam.has_submitted && exam.score !== undefined && (
                      <p className="text-sm font-medium text-emerald-deep">
                        Score: {exam.score}/{exam.max_score}
                      </p>
                    )}
                    {exam.status === "open" && !topicsComplete && (
                      <p className="text-xs text-amber-700">
                        Complete all topics in this Marḥalah to unlock this exam.
                      </p>
                    )}
                    {exam.status === "open" && exam.question_count === 0 && (
                      <p className="text-xs text-amber-700">
                        Waiting for your instructor to add exam questions.
                      </p>
                    )}
                    {exam.status === "upcoming" && (
                      <p className="text-xs text-amber-700">
                        Opens {format(new Date(exam.start_date), "MMM d, yyyy")}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      {canViewResults ? (
                        <Link
                          href={`/exams/${exam.id}/results`}
                          className={buttonVariants({
                            className: "flex-1 bg-emerald-deep hover:bg-emerald-mid text-cream",
                          })}
                        >
                          View results
                        </Link>
                      ) : canTake ? (
                        <Link
                          href={`/exams/${exam.id}`}
                          className={buttonVariants({
                            className: "flex-1 bg-emerald-deep hover:bg-emerald-mid text-cream",
                          })}
                        >
                          Start exam
                        </Link>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );

              return <div key={exam.id}>{card}</div>;
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
