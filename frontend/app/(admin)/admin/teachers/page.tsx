"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { matchesTeacherSearch } from "@/lib/student-search";
import { AppShell } from "@/components/layout/app-shell";
import { ClickableListCard } from "@/components/layout/clickable-list-card";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function AdminTeachersPage() {
  const [search, setSearch] = useState("");

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: adminApi.getTeachers,
  });

  const filtered = useMemo(
    () => teachers?.filter((t) => matchesTeacherSearch(t, search)) ?? [],
    [teachers, search]
  );

  const hasSearch = search.trim().length > 0;

  return (
    <AppShell variant="admin">
      <PageHeader title="Teacher Management" />

      <div className="page-content space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search by name, phone, or marḥalah..."
            className="sm:max-w-md"
          />
          <Link href="/admin/teachers/new" className="block w-full shrink-0 sm:w-auto">
            <Button className="w-full sm:w-auto btn-emerald gap-2">
              <HugeiconsIcon icon={Add01Icon} size={18} />
              Add Teacher
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="relative z-10 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {filtered.map((teacher) => (
              <ClickableListCard
                key={teacher.id}
                href={`/admin/teachers/${teacher.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-emerald-light text-emerald-deep text-sm">
                      {teacher.first_name?.[0] ?? "?"}
                      {teacher.last_name?.[0] ?? ""}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {teacher.first_name} {teacher.last_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {teacher.phone || "No phone"} ·{" "}
                      {teacher.gender === "female" ? "Female" : "Male"} · All Marḥalahs
                    </p>
                  </div>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={18}
                    className="shrink-0 text-muted-foreground"
                  />
                </div>
              </ClickableListCard>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {hasSearch
              ? "No teachers match your search."
              : "No teachers yet. Add one and share login credentials."}
          </p>
        )}
      </div>
    </AppShell>
  );
}
