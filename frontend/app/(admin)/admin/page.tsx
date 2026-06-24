"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  BookOpen01Icon,
  File01Icon,
  Task01Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";

const quickActions = [
  { label: "Register New Student", href: "/admin/students/new", icon: UserGroupIcon },
  { label: "Add New Lesson", href: "/admin/lessons/new", icon: Add01Icon },
  { label: "Create Exercise", href: "/admin/exercises", icon: Task01Icon },
  { label: "Create Exam", href: "/admin/exams", icon: File01Icon },
  { label: "Manage Students", href: "/admin/students", icon: UserGroupIcon },
];

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: adminApi.getStats,
  });

  const statCards = stats
    ? [
        { label: "Total Students", value: stats.total_students, icon: UserGroupIcon },
        { label: "Marḥalah", value: stats.total_marhalahs, icon: BookOpen01Icon },
        { label: "Topics", value: stats.total_topics, icon: File01Icon },
        { label: "Assessments", value: stats.total_assessments, icon: Task01Icon },
      ]
    : [];

  return (
    <AppShell variant="admin">
      <PageHeader title="Admin Dashboard" subtitle="Tajweed Academy" />

      <div className="page-content">
        {isError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-destructive">
                Cannot reach Supabase
              </p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Check your Supabase URL and anon key in .env.local"}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                See supabase/README.md for setup
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="stat-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && !isError && stats && (
          <div className="stat-grid">
            {statCards.map((stat) => (
              <Card key={stat.label} className="card-shadow">
                <CardContent className="p-4">
                  <HugeiconsIcon
                    icon={stat.icon}
                    size={20}
                    className="text-emerald-deep mb-2"
                  />
                  <p className="text-2xl font-bold text-emerald-deep">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-emerald-deep mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Card className="card-shadow hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-light flex items-center justify-center">
                      <HugeiconsIcon
                        icon={action.icon}
                        size={20}
                        className="text-emerald-deep"
                      />
                    </div>
                    <span className="font-medium text-sm">{action.label}</span>
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
