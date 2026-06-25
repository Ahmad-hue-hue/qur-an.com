"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MarhalahEditDialog } from "@/components/admin/marhalah-edit-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export function MarhalahSelectWithEdit({
  value,
  onValueChange,
  triggerClassName,
}: {
  value: string;
  onValueChange: (value: string) => void;
  triggerClassName?: string;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <Select
          value={value}
          onValueChange={(v) => onValueChange(v ?? value)}
        >
          <SelectTrigger
            className={cn("w-full sm:w-40", triggerClassName)}
          >
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit Marḥalah"
          onClick={() => setEditOpen(true)}
        >
          <HugeiconsIcon icon={Edit02Icon} size={16} />
        </Button>
      </div>

      <MarhalahEditDialog
        marhalahNumber={parseInt(value) || 1}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
