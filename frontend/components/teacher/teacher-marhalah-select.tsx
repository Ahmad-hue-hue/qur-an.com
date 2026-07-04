"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { teacherApi } from "@/lib/api";

export function TeacherMarhalahSelect({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: teacherApi.getProfile,
  });

  const mutation = useMutation({
    mutationFn: (marhalah: number) => teacherApi.setManagedMarhalah(marhalah),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-exercises"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-exams"] });
      toast.success("Marḥalah updated");
    },
    onError: (err: Error) => toast.error(err.message || "Could not update marhalah"),
  });

  const handleChange = (next: string) => {
    onValueChange(next);
    const marhalah = parseInt(next) || 1;
    if (profile?.managed_marhalah !== marhalah) {
      mutation.mutate(marhalah);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Managing Marḥalah</Label>
      <Select value={value} onValueChange={(v) => handleChange(v ?? value)}>
        <SelectTrigger className="w-full sm:w-48">
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
      {profile && (
        <p className="text-xs text-muted-foreground">
          You see {profile.gender === "female" ? "female" : "male"} students in this
          marḥalah only.
        </p>
      )}
    </div>
  );
}
