"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { teacherApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherMarhalahSelect } from "@/components/teacher/teacher-marhalah-select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Task01Icon,
  File01Icon,
  UserGroupIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

export default function TeacherDashboardPage() {
  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: teacherApi.getProfile,
  });

  const marhalahId = String(profile?.managed_marhalah ?? 1);

  const { data: students } = useQuery({
    queryKey: ["teacher-students", marhalahId],
    queryFn: () => teacherApi.getStudents(parseInt(marhalahId, 10)),
  });

  const { data: exercises } = useQuery({
    queryKey: ["teacher-exercises", marhalahId],
    queryFn: () => teacherApi.getExercises(parseInt(marhalahId)),
  });

  const { data: exams } = useQuery({
    queryKey: ["teacher-exams", marhalahId],
    queryFn: () => teacherApi.getExams(parseInt(marhalahId)),
  });

  return (
    <AppShell variant="teacher">
      <PageHeader
        title="Teacher Dashboard"
        subtitle={
          profile
            ? `${profile.first_name} ${profile.last_name} · Marḥalah ${profile.managed_marhalah}`
            : "Tajweed Classes"
        }
      />

      <div className="page-content space-y-6">
        <Card className="card-shadow">
          <CardContent className="p-4">
            <TeacherMarhalahSelect
              value={marhalahId}
              onValueChange={() => {}}
            />
          </CardContent>
        </Card>

        <div className="stat-grid">
          <Card className="card-shadow">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-emerald-deep">
                {students?.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Students (all)</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-emerald-deep">
                {exercises?.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Exercises</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-emerald-deep">
                {exams?.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Exams</p>
            </CardContent>
          </Card>
        </div>

        <section>
          <h2 className="section-title">Quick actions</h2>
          <div className="auto-grid-cards">
            {[
              { label: "Manage exercises", href: "/teacher/exercises", icon: Task01Icon },
              { label: "Manage exams", href: "/teacher/exams", icon: File01Icon },
              { label: "View students", href: "/teacher/students", icon: UserGroupIcon },
              { label: "Overall results", href: "/teacher/results", icon: UserGroupIcon },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-deep focus-visible:ring-offset-2 rounded-xl"
              >
                <Card className="card-shadow hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-light flex items-center justify-center">
                      <HugeiconsIcon
                        icon={action.icon}
                        size={20}
                        className="text-emerald-deep"
                      />
                    </div>
                    <span className="font-medium text-sm flex-1">{action.label}</span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={18}
                      className="text-muted-foreground"
                    />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
