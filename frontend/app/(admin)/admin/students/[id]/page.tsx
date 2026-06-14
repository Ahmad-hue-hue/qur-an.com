"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: student, isLoading } = useQuery({
    queryKey: ["admin-student", id],
    queryFn: () => adminApi.getStudent(parseInt(id)),
  });

  if (isLoading) {
    return (
      <AppShell variant="admin">
        <Skeleton className="h-32 w-full" />
        <BottomNav variant="admin" />
      </AppShell>
    );
  }

  if (!student) return null;

  return (
    <AppShell variant="admin">
      <PageHeader
        title={`${student.first_name} ${student.last_name}`}
        subtitle={student.registration_number || "Pending Assignment"}
      >
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </Link>
      </PageHeader>

      <div className="px-4 py-6 space-y-4">
        <Card className="card-shadow">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-sm text-emerald-deep">
              Student Information
            </h3>
            {[
              ["Email", student.email],
              ["Phone", student.phone || "—"],
              ["Registration", student.registration_number || "Pending"],
              ["Current Marḥalah", `Marḥalah ${student.current_marhalah}`],
              ["Progress", `${student.progress_percent}%`],
              ["Topics", `${student.topics_completed}/${student.total_topics}`],
              ["Overall Average", `${student.overall_average}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="text-sm">
            Assign Reg No
          </Button>
          <Button variant="outline" className="text-sm">
            Edit Info
          </Button>
          <Button variant="outline" className="text-sm">
            Promote
          </Button>
          <Button variant="outline" className="text-sm text-destructive">
            Suspend
          </Button>
        </div>
      </div>

      <BottomNav variant="admin" />
    </AppShell>
  );
}
