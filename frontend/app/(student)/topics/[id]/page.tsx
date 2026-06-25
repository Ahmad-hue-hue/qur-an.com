"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { AudioPlayer } from "@/components/shared/audio-player";
import { DownloadButton } from "@/components/shared/download-button";
import { sanitizeDownloadName } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Bookmark01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

export default function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const topicId = parseInt(id);
  const queryClient = useQueryClient();
  const [completed, setCompleted] = useState(false);

  const { data: topic, isLoading } = useQuery({
    queryKey: ["topic", topicId],
    queryFn: () => studentApi.getTopic(topicId),
  });

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: studentApi.getDashboard,
  });

  const totalTopics =
    dashboard?.marhalahs.find((m) => m.id === topic?.marhalah)?.topics_count ??
    dashboard?.total_topics ??
    0;

  const completeMutation = useMutation({
    mutationFn: () => studentApi.completeTopic(topicId),
    onSuccess: () => {
      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      toast.success("Topic marked as completed!");
    },
  });

  const isDone = topic ? topic.is_completed || completed : false;

  return (
    <AppShell>
      {isLoading && (
        <>
          <Skeleton className="h-32 w-full rounded-none" />
          <div className="page-loading">
            <Skeleton className="h-48 w-full" />
          </div>
        </>
      )}

      {!isLoading && topic && (
        <>
      <PageHeader title={topic.title} arabicTitle={topic.arabic_title}>
        <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-cream/80 text-sm hover:text-cream"
          >
            <HugeiconsIcon icon={Home01Icon} size={16} />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gold/20 text-gold border-0">
              Topic {topic.order} of {totalTopics || "—"}
            </Badge>
            <HugeiconsIcon
              icon={Bookmark01Icon}
              size={18}
              className="text-cream/60"
            />
          </div>
        </div>
      </PageHeader>

      <div className="page-content">
        {topic.arabic_content && (
          <Card className="card-shadow">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-emerald-deep mb-2">
                Definition
              </h3>
              <p className="font-arabic text-lg leading-relaxed">
                {topic.arabic_content}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="card-shadow">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-emerald-deep mb-2">
              Explanation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {topic.content}
            </p>
          </CardContent>
        </Card>

        {topic.examples && (
          <Card className="card-shadow">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-emerald-deep mb-3">
                Examples
              </h3>
              <div className="space-y-2">
                {topic.examples.split(" — ").map((ex, i) => (
                  <p key={i} className="font-arabic text-lg text-center py-2">
                    {ex}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <AudioPlayer src={topic.audio_url} title="Lesson Audio" />

        <DownloadButton
          url={topic.audio_url}
          filename={sanitizeDownloadName(topic.title, "mp3")}
          label="Download Audio"
          fullWidth
        />

        <DownloadButton
          url={topic.pdf_url}
          filename={sanitizeDownloadName(`${topic.title}-lesson`, "pdf")}
          label="Download PDF"
          fullWidth
        />

        <Button
          className="w-full h-11 sm:h-10 bg-emerald-deep hover:bg-emerald-mid text-cream gap-2"
          disabled={isDone || completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} />
          {isDone ? "Completed" : "Mark as Completed"}
        </Button>
      </div>
        </>
      )}

    </AppShell>
  );
}
