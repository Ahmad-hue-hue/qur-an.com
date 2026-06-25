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
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function AdminCreateStudentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });

  const [createdCredentials, setCreatedCredentials] = useState<{
    login_email: string;
    temporary_password: string;
    name: string;
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: () => adminApi.createStudent(form),
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      if (student.login_email && student.temporary_password) {
        setCreatedCredentials({
          login_email: student.login_email,
          temporary_password: student.temporary_password,
          name: `${student.first_name} ${student.last_name}`,
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
    form.first_name.trim() && form.last_name.trim() && form.phone.trim();

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

      <div className="page-content max-w-2xl">
        <Card className="card-shadow">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a student account. Share the generated login email and
              temporary password with the student so they can sign in.
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
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="966501234567"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating..." : "Create Student Account"}
            </Button>
          </CardContent>
        </Card>

        {createdCredentials && (
          <Card className="card-shadow border-gold/40">
            <CardContent className="p-5 space-y-4">
              <p className="font-medium text-emerald-deep">
                Account created for {createdCredentials.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Copy these credentials and share them securely with the student.
              </p>
              <div className="space-y-2">
                <Label>Login email</Label>
                <Input readOnly value={createdCredentials.login_email} />
              </div>
              <div className="space-y-2">
                <Label>Temporary password</Label>
                <Input readOnly value={createdCredentials.temporary_password} />
              </div>
              <Button
                className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                onClick={() => router.push("/admin/students")}
              >
                Done
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
