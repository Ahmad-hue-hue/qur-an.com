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
  const { data: exercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: studentApi.getExercises,
  });

  const { data: exams } = useQuery({
    queryKey: ["exams"],
    queryFn: studentApi.getExams,
  });

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: studentApi.getDashboard,
  });

  return (
    <AppShell>
      <PageHeader title="Assessments" subtitle="Exercises & Exams" />

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
              <Link
                key={ex.id}
                href={ex.status === "open" ? `/exercises/${ex.id}` : "#"}
              >
                <Card
                  className={`card-shadow ${ex.status === "open" ? "hover:shadow-md" : ""}`}
                >
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
                    {ex.score !== undefined && (
                      <p className="text-sm font-medium text-emerald-deep mt-2">
                        Score: {ex.score}/{ex.max_score}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>

          <TabsContent value="exams" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {exams?.map((exam) => (
              <Card key={exam.id} className="card-shadow">
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
                </CardContent>
              </Card>
            ))}
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
