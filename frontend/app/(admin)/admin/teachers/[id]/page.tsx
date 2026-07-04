"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import type { Gender } from "@/lib/types";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function AdminTeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    gender: "male" as Gender,
    managed_marhalah: "1",
  });

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["admin-teacher", id],
    queryFn: () => adminApi.getTeacher(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-teacher", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updateTeacher(id, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password.trim() || undefined,
        gender: form.gender,
        managed_marhalah: parseInt(form.managed_marhalah, 10) || 1,
      }),
    onSuccess: () => {
      invalidate();
      setEditOpen(false);
      setForm((prev) => ({ ...prev, password: "" }));
      toast.success("Teacher updated");
    },
    onError: (err: Error) => toast.error(err.message || "Update failed"),
  });

  const openEdit = () => {
    if (!teacher) return;
    setForm({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email || "",
      password: "",
      gender: (teacher.gender as Gender) ?? "male",
      managed_marhalah: String(teacher.managed_marhalah ?? 1),
    });
    setEditOpen(true);
  };

  return (
    <AppShell variant="admin">
      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && teacher && (
        <>
          <PageHeader title={`${teacher.first_name} ${teacher.last_name}`}>
            <Link
              href="/admin/teachers"
              className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              Back to Teachers
            </Link>
          </PageHeader>

          <div className="page-content max-w-2xl space-y-4">
            <Card className="card-shadow">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-sm text-emerald-deep">
                  Teacher Information
                </h3>
                {[
                  ["Login email", teacher.email || "—"],
                  ["Gender", teacher.gender === "female" ? "Female" : "Male"],
                  ["Managed Marḥalah", teacher.managed_marhalah ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full" onClick={openEdit}>
              Edit Teacher
            </Button>
          </div>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Teacher</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="form-grid-2">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={form.first_name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, first_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={form.last_name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, last_name: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Login email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                  />
                </div>
                <div className="form-grid-2">
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={form.gender}
                      onValueChange={(v) =>
                        setForm((prev) => ({ ...prev, gender: (v ?? "male") as Gender }))
                      }
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
                    <Label>Managed Marḥalah</Label>
                    <Select
                      value={form.managed_marhalah}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          managed_marhalah: v ?? prev.managed_marhalah,
                        }))
                      }
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
                  disabled={
                    updateMutation.isPending ||
                    !form.first_name.trim() ||
                    !form.last_name.trim() ||
                    !form.email.trim() ||
                    (form.password.trim().length > 0 && form.password.trim().length < 6)
                  }
                  onClick={() => updateMutation.mutate()}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AppShell>
  );
}
