"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, ArrowRight01Icon, Add01Icon } from "@hugeicons/core-free-icons";

export default function AdminStudentsPage() {
  const [search, setSearch] = useState("");
  const [marhalahFilter, setMarhalahFilter] = useState("all");

  const { data: students } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const filtered = students?.filter((s) => {
    const matchesSearch =
      !search ||
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search.replace(/\D/g, "")) ||
      s.registration_number?.toLowerCase().includes(search.toLowerCase());
    const matchesMarhalah =
      marhalahFilter === "all" ||
      String(s.current_marhalah ?? 1) === marhalahFilter;
    return matchesSearch && matchesMarhalah;
  });

  return (
    <AppShell variant="admin">
      <PageHeader title="Student Management" />

      <div className="page-content">
        <Link href="/admin/students/new">
          <Button className="w-full sm:w-auto bg-emerald-deep hover:bg-emerald-mid text-cream gap-2">
            <HugeiconsIcon icon={Add01Icon} size={18} />
            Register New Student
          </Button>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <HugeiconsIcon
              icon={Search01Icon}
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search students..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            value={marhalahFilter}
            onValueChange={(v) => setMarhalahFilter(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-48">
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

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {filtered?.map((student) => (
            <Link key={student.id} href={`/admin/students/${student.id}`}>
              <Card className="card-shadow hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-emerald-light text-emerald-deep text-sm">
                      {student.first_name[0]}
                      {student.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {student.registration_number || "Pending Assignment"} ·{" "}
                      {student.phone || "No phone"}
                    </p>
                  </div>
                  {student.is_suspended && (
                    <span className="text-xs text-destructive font-medium">
                      Suspended
                    </span>
                  )}
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
      </div>

    </AppShell>
  );
}
