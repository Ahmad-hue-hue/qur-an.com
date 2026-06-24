"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TopicList } from "@/components/student/topic-list";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon } from "@hugeicons/core-free-icons";

export default function MarhalahTopicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const marhalahId = parseInt(id);

  const { data: marhalahs } = useQuery({
    queryKey: ["marhalahs"],
    queryFn: studentApi.getMarhalahs,
  });

  const { data: topics, isLoading } = useQuery({
    queryKey: ["topics", marhalahId],
    queryFn: () => studentApi.getTopics(marhalahId),
  });

  const marhalah = marhalahs?.find((m) => m.id === marhalahId);
  const completed = topics?.filter((t) => t.is_completed).length ?? 0;
  const total = topics?.length ?? 0;

  return (
    <AppShell>
      <PageHeader
        title={marhalah?.title || `Marḥalah ${id}`}
        subtitle={`${completed}/${total} Completed`}
      >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2 hover:text-cream"
          >
            <HugeiconsIcon icon={Home01Icon} size={16} />
            Back to Home
          </Link>
      </PageHeader>

      <div className="page-content">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <TopicList topics={topics || []} />
        )}
      </div>

    </AppShell>
  );
}
