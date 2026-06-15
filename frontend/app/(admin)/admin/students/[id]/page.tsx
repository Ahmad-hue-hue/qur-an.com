"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const studentId = parseInt(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    registration_number: "",
  });

  const { data: student, isLoading } = useQuery({
    queryKey: ["admin-student", id],
    queryFn: () => adminApi.getStudent(studentId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-student", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-students"] });
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updateStudent(studentId, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        registration_number: form.registration_number.trim() || null,
      }),
    onSuccess: () => {
      invalidate();
      setEditOpen(false);
      toast.success("Student updated");
    },
    onError: (err: Error) => toast.error(err.message || "Update failed"),
  });

  const assignRegMutation = useMutation({
    mutationFn: () => adminApi.assignRegistrationNumber(studentId),
    onSuccess: (updated) => {
      invalidate();
      setForm((prev) => ({
        ...prev,
        registration_number: updated.registration_number || "",
      }));
      toast.success("Registration number generated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to assign number"),
  });

  const promoteMutation = useMutation({
    mutationFn: () =>
      adminApi.updateStudent(studentId, {
        current_marhalah: Math.min(4, (student?.current_marhalah ?? 1) + 1),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Student promoted");
    },
    onError: (err: Error) => toast.error(err.message || "Promote failed"),
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      adminApi.updateStudent(studentId, {
        is_suspended: !student?.is_suspended,
      }),
    onSuccess: () => {
      invalidate();
      toast.success(student?.is_suspended ? "Student reactivated" : "Student suspended");
    },
    onError: (err: Error) => toast.error(err.message || "Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("Student deleted");
      router.push("/admin/students");
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  const openEdit = () => {
    if (!student) return;
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      phone: student.phone || "",
      registration_number: student.registration_number || "",
    });
    setEditOpen(true);
  };

  return (
    <AppShell variant="admin">
      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && student && (
        <>
      <PageHeader
        title={`${student.first_name} ${student.last_name}`}
        subtitle={student.registration_number || "Pending Assignment"}
      >
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </Link>
      </PageHeader>

      <div className="px-4 py-6 space-y-4">
        {student.is_suspended && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive font-medium">
              This student account is suspended.
            </CardContent>
          </Card>
        )}

        <Card className="card-shadow">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-sm text-emerald-deep">
              Student Information
            </h3>
            {[
              ["Email", student.email],
              ["Phone", student.phone || "—"],
              ["Registration", student.registration_number || "Pending"],
              ["Current Marḥalah", `Marḥalah ${student.current_marhalah}`],
              ["Progress", `${student.progress_percent}%`],
              ["Topics", `${student.topics_completed}/${student.total_topics}`],
              ["Overall Average", `${student.overall_average}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="text-sm" onClick={openEdit}>
            Edit Info
          </Button>
          <Button
            variant="outline"
            className="text-sm"
            disabled={student.current_marhalah >= 4 || promoteMutation.isPending}
            onClick={() => promoteMutation.mutate()}
          >
            Promote
          </Button>
          <Button
            variant="outline"
            className="text-sm text-destructive"
            disabled={suspendMutation.isPending}
            onClick={() => suspendMutation.mutate()}
          >
            {student.is_suspended ? "Reactivate" : "Suspend"}
          </Button>
          <Button
            variant="outline"
            className="text-sm text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete Student
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
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
              <Label>Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input
                placeholder="e.g. TJW-2026-001"
                value={form.registration_number}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    registration_number: e.target.value,
                  }))
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={assignRegMutation.isPending}
                onClick={() => assignRegMutation.mutate()}
              >
                {assignRegMutation.isPending ? "Generating..." : "Auto-generate number"}
              </Button>
            </div>
            <Button
              className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
              disabled={
                updateMutation.isPending ||
                !form.first_name.trim() ||
                !form.last_name.trim() ||
                !form.phone.trim()
              }
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete student?"
        description={`This will permanently remove ${student.first_name} ${student.last_name} and all related progress. This cannot be undone.`}
        confirmLabel="Delete Student"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
        </>
      )}

      <BottomNav variant="admin" />
    </AppShell>
  );
}
