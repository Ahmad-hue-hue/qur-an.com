"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function TeacherManageStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [form, setForm] = useState<{
    first_name: string;
    last_name: string;
    phone: string;
    registration_number: string;
    current_marhalah: string;
  } | null>(null);

  const { data: student, isLoading } = useQuery({
    queryKey: ["teacher-student", id],
    queryFn: () => teacherApi.getStudent(id),
  });

  const activeForm = form ?? (student
    ? {
        first_name: student.first_name,
        last_name: student.last_name,
        phone: student.phone ?? "",
        registration_number: student.registration_number ?? "",
        current_marhalah: String(student.current_marhalah ?? 1),
      }
    : null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["teacher-student", id] });
    queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      teacherApi.updateStudent(id, {
        first_name: activeForm?.first_name,
        last_name: activeForm?.last_name,
        phone: activeForm?.phone,
        change_password: changePassword,
        password: changePassword ? password : undefined,
        registration_number: activeForm?.registration_number.trim() || null,
        current_marhalah: parseInt(activeForm?.current_marhalah ?? "1", 10) || 1,
      }),
    onSuccess: () => {
      invalidate();
      setChangePassword(false);
      setPassword("");
      toast.success("Student updated");
    },
    onError: (error: Error) => toast.error(error.message || "Update failed"),
  });

  const assignMutation = useMutation({
    mutationFn: () => teacherApi.assignRegistrationNumber(id),
    onSuccess: (updated) => {
      setForm((current) => ({
        ...(current ?? activeForm!),
        registration_number: updated.registration_number ?? "",
      }));
      invalidate();
      toast.success("Registration number generated");
    },
    onError: (error: Error) => toast.error(error.message || "Could not generate number"),
  });

  const promoteMutation = useMutation({
    mutationFn: () =>
      teacherApi.updateStudent(id, {
        current_marhalah: Math.min(4, (student?.current_marhalah ?? 1) + 1),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Student promoted");
    },
    onError: (error: Error) => toast.error(error.message || "Promote failed"),
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      teacherApi.updateStudent(id, { is_suspended: !student?.is_suspended }),
    onSuccess: () => {
      invalidate();
      toast.success(student?.is_suspended ? "Student reactivated" : "Student suspended");
    },
    onError: (error: Error) => toast.error(error.message || "Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => teacherApi.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
      toast.success("Student deleted");
      router.push("/teacher/students");
    },
    onError: (error: Error) => toast.error(error.message || "Delete failed"),
  });

  return (
    <AppShell variant="teacher">
      <PageHeader title="Manage student" subtitle={student?.registration_number ?? "Student"}>
        <Link href={`/teacher/students/${id}`} className="mt-2 inline-block text-sm text-cream/80">
          Back to student
        </Link>
      </PageHeader>
      <div className="page-content max-w-2xl space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {student && activeForm && (
          <>
            <Card className="card-shadow">
              <CardContent className="space-y-4 p-5">
                <div className="form-grid-2">
                  <div className="space-y-2"><Label>First name</Label><Input value={activeForm.first_name} onChange={(event) => setForm((current) => ({ ...(current ?? activeForm), first_name: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>Last name</Label><Input value={activeForm.last_name} onChange={(event) => setForm((current) => ({ ...(current ?? activeForm), last_name: event.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Phone number</Label><Input value={activeForm.phone} onChange={(event) => setForm((current) => ({ ...(current ?? activeForm), phone: event.target.value }))} /></div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={changePassword}
                      onChange={(event) => {
                        setChangePassword(event.target.checked);
                        if (!event.target.checked) setPassword("");
                      }}
                      className="rounded border-border"
                    />
                    Change login password
                  </label>
                  {changePassword && (
                    <div className="space-y-2">
                      <Label>New password</Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Marḥalah</Label>
                  <Select value={activeForm.current_marhalah} onValueChange={(value) => setForm((current) => ({ ...(current ?? activeForm), current_marhalah: value ?? "1" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1, 2, 3, 4].map((number) => <SelectItem key={number} value={String(number)}>Marḥalah {number}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Registration number</Label>
                  <Input value={activeForm.registration_number} onChange={(event) => setForm((current) => ({ ...(current ?? activeForm), registration_number: event.target.value }))} />
                  <Button type="button" variant="outline" className="w-full" onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}>
                    {assignMutation.isPending ? "Generating…" : "Auto-generate number"}
                  </Button>
                </div>
                <Button
                  className="w-full btn-emerald"
                  onClick={() => updateMutation.mutate()}
                  disabled={
                    updateMutation.isPending ||
                    (changePassword && password.trim().length < 6)
                  }
                >
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="outline" onClick={() => promoteMutation.mutate()} disabled={student.current_marhalah >= 4 || promoteMutation.isPending}>Promote</Button>
              <Button variant="outline" onClick={() => suspendMutation.mutate()} disabled={suspendMutation.isPending}>{student.is_suspended ? "Reactivate" : "Suspend"}</Button>
              <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
            </div>
          </>
        )}
      </div>
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete student?" description={student?.registration_number ?? undefined} confirmLabel="Delete" destructive loading={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate()} />
    </AppShell>
  );
}
