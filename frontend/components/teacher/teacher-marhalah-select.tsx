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
  allowAll = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  allowAll?: boolean;
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
      queryClient.invalidateQueries({ queryKey: ["teacher-results-roster"] });
      toast.success("Marhalah view updated");
    },
    onError: (err: Error) => toast.error(err.message || "Could not update marhalah"),
  });

  const handleChange = (next: string) => {
    onValueChange(next);
    if (next === "all") return;

    const marhalah = parseInt(next) || 1;
    if (profile?.managed_marhalah !== marhalah) {
      mutation.mutate(marhalah);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Viewing Marḥalah</Label>
      <Select value={value} onValueChange={(v) => handleChange(v ?? value)}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all">All Marḥalahs</SelectItem>}
          {[1, 2, 3, 4].map((n) => (
            <SelectItem key={n} value={String(n)}>
              Marḥalah {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {profile && (
        <p className="text-xs text-muted-foreground">
          {value === "all"
            ? "Students from all Marḥalahs."
            : `Students in Marḥalah ${value}. You can switch between all Marḥalahs.`}
        </p>
      )}
    </div>
  );
}
