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

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.updateMarhalah(marhalah.number, {
        title,
        description,
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

      <p className="text-xs text-muted-foreground rounded-xl bg-emerald-light/30 px-3 py-2">
        Students open lessons when you unlock each lesson under Content. Marḥalah
        stages themselves are not unlocked as a whole.
      </p>

      <p className="text-xs text-muted-foreground">
        {marhalah.topics_count} lesson{marhalah.topics_count === 1 ? "" : "s"} in
        this Marḥalah
      </p>

      <Button
        type="button"
        className="w-full btn-emerald"
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
            Update the title and description for this stage. Unlock individual
            lessons from Content.
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
