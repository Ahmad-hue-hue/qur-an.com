"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function AdminTeachersPage() {
  const { data: teachers } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: adminApi.getTeachers,
  });

  return (
    <AppShell variant="admin">
      <PageHeader title="Teacher Management" />

      <div className="page-content">
        <Link href="/admin/teachers/new">
          <Button className="w-full sm:w-auto btn-emerald gap-2">
            <HugeiconsIcon icon={Add01Icon} size={18} />
            Add Teacher
          </Button>
        </Link>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 mt-4">
          {teachers?.map((teacher) => (
            <Link key={teacher.id} href={`/admin/teachers/${teacher.id}`}>
            <Card className="card-shadow hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-emerald-light text-emerald-deep text-sm">
                    {teacher.first_name[0]}
                    {teacher.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {teacher.first_name} {teacher.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {teacher.gender === "female" ? "Female" : "Male"} · Marḥalah{" "}
                    {teacher.managed_marhalah ?? "—"}
                  </p>
                </div>
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

        {teachers?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No teachers yet. Add one and share login credentials.
          </p>
        )}
      </div>
    </AppShell>
  );
}
