"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { AudioPlayer } from "@/components/shared/audio-player";
import { DownloadButton } from "@/components/shared/download-button";
import { FormattedText } from "@/components/shared/formatted-text";
import { sanitizeDownloadName } from "@/lib/download";
import { audioExtensionFromUrl } from "@/lib/lesson-audio";
import { Button, buttonVariants } from "@/components/ui/button";
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

  const topicMarhalah = dashboard?.marhalahs.find((m) => m.id === topic?.marhalah);
  const totalTopics = topicMarhalah?.topics_count ?? 0;

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
            href={
              dashboard?.current_marhalah
                ? `/marhalah/${dashboard.current_marhalah.id}`
                : "/dashboard"
            }
            className="inline-flex items-center gap-1 text-cream/80 text-sm hover:text-cream"
          >
            <HugeiconsIcon icon={Home01Icon} size={16} />
            Back to {dashboard?.current_marhalah.title ?? "Lessons"}
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gold/20 text-gold border-0">
              {topicMarhalah?.title ?? "Lesson"} · Topic {topic.order} of{" "}
              {totalTopics || "—"}
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
        <Card className="card-shadow">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-emerald-deep mb-2">
              Definition
            </h3>
            <FormattedText className="font-arabic text-lg leading-relaxed">
              {topic.arabic_content}
            </FormattedText>
          </CardContent>
        </Card>

        {topic.content?.trim() && (
          <Card className="card-shadow">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-emerald-deep mb-2">
                Explanation
              </h3>
              <FormattedText className="text-sm text-muted-foreground leading-relaxed">
                {topic.content}
              </FormattedText>
            </CardContent>
          </Card>
        )}

        {topic.examples && (
          <Card className="card-shadow">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-emerald-deep mb-3">
                Examples
              </h3>
              <FormattedText className="font-arabic text-lg text-center py-2 leading-relaxed">
                {topic.examples}
              </FormattedText>
            </CardContent>
          </Card>
        )}

        <AudioPlayer src={topic.audio_url} title="Lesson Audio" />

        <div className="flex gap-2">
          <DownloadButton
            url={topic.audio_url}
            filename={sanitizeDownloadName(
              topic.title,
              topic.audio_url ? audioExtensionFromUrl(topic.audio_url) : "mp3"
            )}
            label="Audio"
            tone="gold"
            className="flex-1 min-w-0 gap-1.5 text-xs sm:text-sm"
          />
          <DownloadButton
            url={topic.pdf_url}
            filename={sanitizeDownloadName(`${topic.title}-lesson`, "pdf")}
            label="PDF"
            tone="gold"
            className="flex-1 min-w-0 gap-1.5 text-xs sm:text-sm"
          />
        </div>

        <Button
          className="w-full h-11 sm:h-10 btn-emerald gap-2"
          disabled={isDone || completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} />
          {isDone ? "Completed" : "Mark as Completed"}
        </Button>

        {!topic.is_last_lesson && topic.exercise_id && isDone && (
          <Card className="card-shadow border-gold/30 bg-gold-light/20">
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-emerald-deep">
                  Lesson Exercise
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {topic.exercise_submitted
                    ? "You finished this lesson quiz. View your score and answers."
                    : "Complete the quick quiz for this lesson."}
                </p>
              </div>
              <Link
                href={
                  topic.exercise_submitted
                    ? `/exercises/${topic.exercise_id}/results`
                    : `/exercises/${topic.exercise_id}`
                }
                className={buttonVariants({ className: "w-full btn-emerald" })}
              >
                {topic.exercise_submitted ? "View results" : "Take exercise"}
              </Link>
            </CardContent>
          </Card>
        )}

        {topic.is_last_lesson && isDone && (
          <Card className="card-shadow border-emerald-deep/20 bg-emerald-light/20">
            <CardContent className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-emerald-deep">
                Marḥalah complete
              </h3>
              <p className="text-xs text-muted-foreground">
                Return to your lessons list to take the final Marḥalah exam.
              </p>
              <Link
                href={
                  dashboard?.current_marhalah
                    ? `/marhalah/${dashboard.current_marhalah.id}`
                    : "/dashboard"
                }
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                Go to Marḥalah exam
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
        </>
      )}

    </AppShell>
  );
}
