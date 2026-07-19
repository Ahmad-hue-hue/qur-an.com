"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { teacherApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TeacherCreateStudentPage() {
  const router = useRouter();
  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: teacherApi.getProfile,
  });
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    password: "",
    current_marhalah: "1",
    registration_number: "",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      teacherApi.createStudent({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        password: form.password,
        gender: profile?.gender ?? "male",
        current_marhalah: parseInt(form.current_marhalah, 10) || 1,
        registration_number: form.registration_number.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Student account created");
      router.push("/teacher/students");
    },
    onError: (error: Error) => toast.error(error.message || "Could not create student"),
  });

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const canSubmit =
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.phone.trim() &&
    form.password.trim().length >= 6;

  return (
    <AppShell variant="teacher">
      <PageHeader title="Add student" subtitle="Students are added to your gender group.">
        <Link href="/teacher/students" className="mt-2 inline-block text-sm text-cream/80">
          Back to students
        </Link>
      </PageHeader>
      <div className="page-content max-w-2xl">
        <Card className="card-shadow">
          <CardContent className="space-y-4 p-5">
            <div className="form-grid-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input value={form.first_name} onChange={(event) => update("first_name", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input value={form.last_name} onChange={(event) => update("last_name", event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone number</Label>
              <Input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Marḥalah</Label>
              <Select value={form.current_marhalah} onValueChange={(value) => update("current_marhalah", value ?? "1")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((number) => (
                    <SelectItem key={number} value={String(number)}>Marḥalah {number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Registration number (optional)</Label>
              <Input value={form.registration_number} onChange={(event) => update("registration_number", event.target.value)} />
            </div>
            <Button className="w-full btn-emerald" disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Creating..." : "Create student"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
