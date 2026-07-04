"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import type { Gender } from "@/lib/types";
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

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

export default function AdminCreateTeacherPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    gender: "male" as Gender,
    managed_marhalah: "1",
  });

  const [createdCredentials, setCreatedCredentials] = useState<{
    login_email: string;
    password: string;
    name: string;
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createTeacher({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender,
        managed_marhalah: parseInt(form.managed_marhalah, 10) || 1,
      }),
    onSuccess: (teacher) => {
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
      const password =
        teacher.temporary_password?.trim() || form.password.trim();
      if (teacher.login_email && password) {
        setCreatedCredentials({
          login_email: teacher.login_email,
          password,
          name: `${teacher.first_name} ${teacher.last_name}`,
        });
        toast.success("Teacher account created");
        return;
      }
      toast.success("Teacher account created");
      router.push("/admin/teachers");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create teacher"),
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canSubmit =
    form.email.trim() &&
    form.password.length >= 6 &&
    form.first_name.trim() &&
    form.last_name.trim();

  const credentialsBlock = createdCredentials
    ? [
        `Teacher: ${createdCredentials.name}`,
        `Login email: ${createdCredentials.login_email}`,
        `Password: ${createdCredentials.password}`,
        "",
        "Sign in at the main login page (/login) — not the admin sign-in link.",
      ].join("\n")
    : "";

  return (
    <AppShell variant="admin">
      <PageHeader title="Add Teacher">
        <Link
          href="/admin/teachers"
          className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to Teachers
        </Link>
      </PageHeader>

      <div className="page-content max-w-2xl space-y-4">
        {!createdCredentials && (
        <Card className="card-shadow">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a teacher account. Share the exact email and password below
              so they can sign in at the main login page (not the admin sign-in).
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
              <Label>Login email</Label>
              <Input
                type="email"
                autoComplete="off"
                placeholder="teacher@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                autoComplete="new-password"
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
                <Label>Default Marḥalah</Label>
                <Select
                  value={form.managed_marhalah}
                  onValueChange={(v) => update("managed_marhalah", v ?? "1")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Marḥalah {n}
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
              {createMutation.isPending ? "Creating..." : "Create Teacher Account"}
            </Button>
          </CardContent>
        </Card>
        )}

        {createdCredentials && (
          <Card className="card-shadow border-gold/40">
            <CardContent className="p-5 space-y-4">
              <p className="font-medium text-emerald-deep">
                Account created for {createdCredentials.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Share these credentials securely. They must use the regular{" "}
                <span className="font-medium text-emerald-deep">/login</span> page,
                not admin sign-in.
              </p>
              <div className="space-y-3 rounded-xl bg-emerald-light/30 p-4">
                <div className="space-y-1.5">
                  <Label>Login email</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={createdCredentials.login_email} className="bg-white" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Copy login email"
                      onClick={() => copyText(createdCredentials.login_email, "Login email")}
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={18} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={createdCredentials.password}
                      className="bg-white font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Copy password"
                      onClick={() => copyText(createdCredentials.password, "Password")}
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={18} />
                    </Button>
                  </div>
                </div>
              </div>
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
                  onClick={() => router.push("/admin/teachers")}
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
