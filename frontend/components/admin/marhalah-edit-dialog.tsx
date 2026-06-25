"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { MarhalahAdmin } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function MarhalahEditForm({
  marhalah,
  onSaved,
}: {
  marhalah: MarhalahAdmin;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(marhalah.title);
  const [description, setDescription] = useState(marhalah.description);
  const [unlockThreshold, setUnlockThreshold] = useState(
    String(marhalah.unlock_threshold)
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.updateMarhalah(marhalah.number, {
        title,
        description,
        unlock_threshold: parseInt(unlockThreshold) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marhalah", marhalah.number] });
      queryClient.invalidateQueries({ queryKey: ["admin-marhalahs"] });
      queryClient.invalidateQueries({ queryKey: ["marhalahs"] });
      toast.success("Marḥalah updated");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message || "Update failed"),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Marḥalah ${marhalah.number}`}
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description shown to students (optional)"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Unlock threshold (%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={unlockThreshold}
          onChange={(e) => setUnlockThreshold(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Minimum final score in the previous Marḥalah required to unlock this
          one. Marḥalah 1 is always open.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        {marhalah.topics_count} lesson{marhalah.topics_count === 1 ? "" : "s"} in
        this Marḥalah
      </p>

      <Button
        type="button"
        className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
        disabled={!title.trim() || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Saving..." : "Save Marḥalah"}
      </Button>
    </div>
  );
}

export function MarhalahEditDialog({
  marhalahNumber,
  open,
  onOpenChange,
}: {
  marhalahNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: marhalah, isLoading } = useQuery({
    queryKey: ["admin-marhalah", marhalahNumber],
    queryFn: () => adminApi.getMarhalah(marhalahNumber),
    enabled: open && marhalahNumber > 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-emerald-deep">
            Edit Marḥalah {marhalahNumber}
          </DialogTitle>
          <DialogDescription>
            Update the title, description, and unlock score for this stage.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Loading...
          </p>
        )}

        {!isLoading && marhalah && (
          <MarhalahEditForm
            key={marhalah.id}
            marhalah={marhalah}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
