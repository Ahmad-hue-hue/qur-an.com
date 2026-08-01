"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { teacherApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ManualMarksPanel } from "@/components/shared/manual-marks-panel";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: student, isLoading } = useQuery({
    queryKey: ["teacher-student", id],
    queryFn: () => teacherApi.getStudent(id),
  });

  const marhalah = student?.current_marhalah ?? 1;

  return (
    <AppShell variant="teacher">
      {isLoading && <Skeleton className="h-32 w-full" />}

      {student && (
        <>
          <PageHeader title={student.registration_number || "Student"}>
            <Link
              href="/teacher/students"
              className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              Back to students
            </Link>
          </PageHeader>

          <div className="page-content max-w-2xl space-y-4">
            <Link href={`/teacher/students/${id}/manage`}>
              <Button variant="outline" className="w-full">
                Manage student
              </Button>
            </Link>
            <Card className="card-shadow">
              <CardContent className="p-5 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Gender:</span>{" "}
                  {student.gender === "female" ? "Female" : "Male"}
                </p>
                <p>
                  <span className="text-muted-foreground">Registration:</span>{" "}
                  {student.registration_number || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Marḥalah:</span>{" "}
                  {marhalah}
                </p>
              </CardContent>
            </Card>

            <ManualMarksPanel
              studentId={id}
              marhalah={marhalah}
              api={teacherApi}
              queryKeyPrefix="teacher-manual-scores"
            />
          </div>
        </>
      )}
    </AppShell>
  );
}
