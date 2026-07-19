"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { teacherApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { ClickableListCard } from "@/components/layout/clickable-list-card";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TeacherMarhalahSelect } from "@/components/teacher/teacher-marhalah-select";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function TeacherStudentsPage() {
  const [search, setSearch] = useState("");
  const [marhalahOverride, setMarhalahOverride] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: teacherApi.getProfile,
  });

  const marhalahId =
    marhalahOverride ?? String(profile?.managed_marhalah ?? 1);
  const isAllMarhalahs = marhalahId === "all";

  const { data: students, isLoading } = useQuery({
    queryKey: ["teacher-students", marhalahId],
    queryFn: () =>
      teacherApi.getStudents(
        isAllMarhalahs ? undefined : parseInt(marhalahId, 10)
      ),
  });

  const filtered = useMemo(
    () => {
      const term = search.trim().toLowerCase();
      return students?.filter((student) =>
        !term || student.registration_number?.toLowerCase().includes(term)
      ) ?? [];
    },
    [students, search]
  );

  const hasSearch = search.trim().length > 0;

  return (
    <AppShell variant="teacher">
      <PageHeader
        title="Students"
        subtitle={
          isAllMarhalahs
            ? "All students, shown by registration number"
            : `Students in Marḥalah ${marhalahId}, shown by registration number`
        }
      />

      <div className="page-content space-y-4">
        <Link href="/teacher/students/new">
          <Button className="btn-emerald">Add student</Button>
        </Link>
        <TeacherMarhalahSelect
          value={marhalahId}
          onValueChange={(v) => setMarhalahOverride(v ?? "1")}
          allowAll
        />

        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search registration number..."
        />

        {isLoading && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {filtered.map((student) => {
              const registrationNumber = student.registration_number || "—";
              return (
                <ClickableListCard
                  key={student.id}
                  href={`/teacher/students/${student.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-light text-emerald-deep text-sm font-mono">
                        {registrationNumber.slice(-2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium font-mono">
                        {registrationNumber}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {student.gender === "female" ? "Female" : "Male"}
                      </p>
                    </div>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={18}
                      className="shrink-0 text-muted-foreground"
                    />
                  </div>
                </ClickableListCard>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {hasSearch
              ? "No students match your search."
              : isAllMarhalahs
                ? "No students yet."
                : "No students in your marḥalah yet."}
          </p>
        )}
      </div>
    </AppShell>
  );
}
