"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Copy01Icon } from "@hugeicons/core-free-icons";

const MARHALAH_OPTIONS = [
  { value: "1", label: "Marḥalah 1" },
  { value: "2", label: "Marḥalah 2" },
  { value: "3", label: "Marḥalah 3" },
  { value: "4", label: "Marḥalah 4" },
];

type CreatedStudent = {
  login_phone: string;
  temporary_password: string;
  name: string;
  current_marhalah: number;
  registration_number?: string;
};

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

export default function AdminCreateStudentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    password: "",
    gender: "male" as "male" | "female",
    current_marhalah: "1",
  });

  const [createdStudent, setCreatedStudent] = useState<CreatedStudent | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createStudent({
        ...form,
        current_marhalah: parseInt(form.current_marhalah, 10) || 1,
        password: form.password,
      }),
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      if (student.login_phone && student.temporary_password) {
        setCreatedStudent({
          login_phone: student.login_phone,
          temporary_password: student.temporary_password,
          name: `${student.first_name} ${student.last_name}`.trim(),
          current_marhalah: student.current_marhalah ?? 1,
          registration_number: student.registration_number ?? undefined,
        });
        toast.success("Student account created");
        return;
      }
      toast.success("Student account created");
      router.push("/admin/students");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create student"),
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canSubmit =
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.phone.trim() &&
    form.password.trim().length >= 6;

  const credentialsBlock = createdStudent
    ? [
        `Student: ${createdStudent.name}`,
        `Marḥalah: ${createdStudent.current_marhalah}`,
        createdStudent.registration_number
          ? `Registration #: ${createdStudent.registration_number}`
          : null,
        `Phone: ${createdStudent.login_phone}`,
        `Password: ${createdStudent.temporary_password}`,
        "",
        "Sign in at the login page with the phone number and password above.",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <AppShell variant="admin">
      <PageHeader title="Register Student">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to Students
        </Link>
      </PageHeader>

      <div className="page-content max-w-2xl space-y-4">
        {!createdStudent && (
          <Card className="card-shadow">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a student account with phone number and password. Email is
                not used for students.
              </p>
              <div className="form-grid-2">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => update("first_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => update("last_name", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone Number (login)</Label>
                <Input
                  type="tel"
                  placeholder="966501234567"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Login password</Label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
              </div>
              <div className="form-grid-2">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) => update("gender", v ?? "male")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marḥalah</Label>
                  <Select
                    value={form.current_marhalah}
                    onValueChange={(v) => update("current_marhalah", v ?? "1")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Marḥalah" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARHALAH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full btn-emerald"
                disabled={!canSubmit || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Create Student Account"}
              </Button>
            </CardContent>
          </Card>
        )}

        {createdStudent && (
          <Card className="card-shadow border-gold/40">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="font-medium text-emerald-deep">
                  Account created for {createdStudent.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Assigned to Marḥalah {createdStudent.current_marhalah}
                  {createdStudent.registration_number
                    ? ` · ${createdStudent.registration_number}`
                    : ""}
                </p>
              </div>

              <div className="space-y-3 rounded-xl bg-emerald-light/30 p-4">
                <div className="space-y-1.5">
                  <Label>Phone (login)</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={createdStudent.login_phone} className="bg-white" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Copy phone"
                      onClick={() => copyText(createdStudent.login_phone, "Phone")}
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={18} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Temporary password</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={createdStudent.temporary_password}
                      className="bg-white font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Copy password"
                      onClick={() =>
                        copyText(createdStudent.temporary_password, "Password")
                      }
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={18} />
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Share these credentials with the student. They sign in at{" "}
                <span className="font-medium text-emerald-deep">/login</span> using
                phone and password.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-emerald-deep text-emerald-deep"
                  onClick={() => copyText(credentialsBlock, "Credentials")}
                >
                  Copy all credentials
                </Button>
                <Button
                  className="flex-1 btn-emerald"
                  onClick={() => router.push("/admin/students")}
                >
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
