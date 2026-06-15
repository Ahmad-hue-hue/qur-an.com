"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DragDropVerticalIcon,
  Edit02Icon,
  Delete02Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";

export default function AdminTopicsPage() {
  const [marhalahId, setMarhalahId] = useState("1");
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: topics, isLoading } = useQuery({
    queryKey: ["admin-topics", marhalahId],
    queryFn: () => adminApi.getTopics(parseInt(marhalahId)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topics"] });
      setPendingDelete(null);
      toast.success("Topic deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  return (
    <AppShell variant="admin">
      <PageHeader title="Manage Topics">
        <div className="flex items-center justify-between mt-3">
          <Select
            value={marhalahId}
            onValueChange={(v) => setMarhalahId(v ?? "1")}
          >
            <SelectTrigger className="w-40 bg-emerald-mid/30 border-cream/20 text-cream">
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
          <Link href="/admin/lessons/new">
            <Button
              size="sm"
              className="bg-gold text-emerald-deep hover:bg-gold/90 gap-1"
            >
              <HugeiconsIcon icon={Add01Icon} size={16} />
              Add Topic
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="px-4 py-6 space-y-2">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading topics...</p>
        )}
        {!isLoading && topics?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No topics yet.</p>
        )}
        {topics?.map((topic) => (
          <Card key={topic.id} className="card-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <HugeiconsIcon
                icon={DragDropVerticalIcon}
                size={18}
                className="text-muted-foreground cursor-grab"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {topic.order}. {topic.title}
                </p>
                {topic.arabic_title && (
                  <p className="font-arabic text-xs text-muted-foreground">
                    {topic.arabic_title}
                  </p>
                )}
              </div>
              <Link href={`/admin/lessons/${topic.id}`} title="Edit lesson">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <HugeiconsIcon icon={Edit02Icon} size={16} />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() =>
                  setPendingDelete({ id: topic.id, title: topic.title })
                }
                disabled={deleteMutation.isPending}
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete lesson?"
        description={`Are you sure you want to delete "${pendingDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete Lesson"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />

      <BottomNav variant="admin" />
    </AppShell>
  );
}
