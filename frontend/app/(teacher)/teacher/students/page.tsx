"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { teacherApi } from "@/lib/api";
import { matchesStudentSearch } from "@/lib/student-search";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeacherMarhalahSelect } from "@/components/teacher/teacher-marhalah-select";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function TeacherStudentsPage() {
  const [search, setSearch] = useState("");
  const [marhalahId, setMarhalahId] = useState("1");

  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: teacherApi.getProfile,
  });

  const { data: students } = useQuery({
    queryKey: ["teacher-students", marhalahId],
    queryFn: teacherApi.getStudents,
  });

  const filtered = students?.filter((s) => matchesStudentSearch(s, search));

  return (
    <AppShell variant="teacher">
      <PageHeader
        title="Students"
        subtitle={
          profile
            ? `${profile.gender === "female" ? "Female" : "Male"} students in your marḥalah`
            : undefined
        }
      />

      <div className="page-content space-y-4">
        <TeacherMarhalahSelect
          value={marhalahId}
          onValueChange={(v) => setMarhalahId(v ?? "1")}
        />

        <div className="relative">
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

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {filtered?.map((student) => (
            <Link key={student.id} href={`/teacher/students/${student.id}`}>
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
                      {student.registration_number || "No reg. number"}
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

        {filtered?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No students match your marḥalah and gender filter.
          </p>
        )}
      </div>
    </AppShell>
  );
}
