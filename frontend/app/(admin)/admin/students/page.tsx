"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { matchesStudentSearch } from "@/lib/student-search";
import { AppShell } from "@/components/layout/app-shell";
import { ClickableListCard } from "@/components/layout/clickable-list-card";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function AdminStudentsPage() {
  const [search, setSearch] = useState("");
  const [marhalahFilter, setMarhalahFilter] = useState("all");

  const { data: students, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const filtered = useMemo(
    () =>
      students?.filter((s) => {
        const matchesSearch = matchesStudentSearch(s, search);
        const matchesMarhalah =
          marhalahFilter === "all" ||
          String(s.current_marhalah ?? 1) === marhalahFilter;
        return matchesSearch && matchesMarhalah;
      }) ?? [],
    [students, search, marhalahFilter]
  );

  const hasStudents = (students?.length ?? 0) > 0;
  const hasSearch = search.trim().length > 0;
  const hasMarhalahFilter = marhalahFilter !== "all";

  return (
    <AppShell variant="admin">
      <PageHeader title="Student Management" />

      <div className="page-content space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search by name, email, phone, or reg. number..."
              className="flex-1"
            />

            <Select
              value={marhalahFilter}
              onValueChange={(v) => setMarhalahFilter(v ?? "all")}
            >
              <SelectTrigger className="w-full shrink-0 sm:w-48">
                <SelectValue placeholder="Filter by Marḥalah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Marḥalahs</SelectItem>
                <SelectItem value="1">Marḥalah 1</SelectItem>
                <SelectItem value="2">Marḥalah 2</SelectItem>
                <SelectItem value="3">Marḥalah 3</SelectItem>
                <SelectItem value="4">Marḥalah 4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Link href="/admin/students/new" className="block w-full shrink-0 lg:w-auto">
            <Button className="w-full btn-emerald gap-2 lg:w-auto">
              <HugeiconsIcon icon={Add01Icon} size={18} />
              Register New Student
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Login email and password are set when you register a student — share
          them securely with the student.
        </p>

        {isLoading && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {filtered.map((student) => (
              <ClickableListCard
                key={student.id}
                href={`/admin/students/${student.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-emerald-light text-emerald-deep text-sm">
                      {student.first_name?.[0] ?? "?"}
                      {student.last_name?.[0] ?? ""}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.registration_number || "Pending Assignment"} ·{" "}
                      {student.phone || student.email || "No contact"}
                    </p>
                  </div>
                  {student.is_suspended && (
                    <span className="text-xs font-medium text-destructive">
                      Suspended
                    </span>
                  )}
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
            {!hasStudents
              ? "No students yet. Register one to get started."
              : hasSearch || hasMarhalahFilter
                ? "No students match your search or filters."
                : "No students found."}
          </p>
        )}
      </div>
    </AppShell>
  );
}
