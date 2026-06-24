"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Upload01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";

export default function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const topicId = parseInt(id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: topic, isLoading } = useQuery({
    queryKey: ["admin-topic", id],
    queryFn: () => adminApi.getTopic(topicId),
  });

  const [marhalahIdOverride, setMarhalahIdOverride] = useState<string | null>(null);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [arabicTitleOverride, setArabicTitleOverride] = useState<string | null>(null);
  const [contentOverride, setContentOverride] = useState<string | null>(null);
  const [arabicContentOverride, setArabicContentOverride] = useState<string | null>(null);
  const [examplesOverride, setExamplesOverride] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const marhalahId = marhalahIdOverride ?? String(topic?.marhalah ?? "1");
  const title = titleOverride ?? topic?.title ?? "";
  const arabicTitle = arabicTitleOverride ?? topic?.arabic_title ?? "";
  const content = contentOverride ?? topic?.content ?? "";
  const arabicContent = arabicContentOverride ?? topic?.arabic_content ?? "";
  const examples = examplesOverride ?? topic?.examples ?? "";

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updateTopic({
        id: topicId,
        marhalah: parseInt(marhalahId),
        order: topic?.order ?? 1,
        title,
        arabic_title: arabicTitle,
        content,
        arabic_content: arabicContent,
        examples,
        audio: audioFile,
        pdf: pdfFile,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-topic", id] });
      toast.success("Lesson updated");
      router.push("/admin/topics");
    },
    onError: (err: Error) => toast.error(err.message || "Update failed"),
  });

  return (
    <AppShell variant="admin">
      {isLoading && (
        <p className="p-6 text-sm text-muted-foreground">Loading lesson...</p>
      )}

      {!isLoading && topic && (
        <>
      <PageHeader title="Edit Lesson">
        <Link
          href="/admin/topics"
          className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to Topics
        </Link>
      </PageHeader>

      <div className="page-content max-w-3xl">
        <div className="space-y-2">
          <Label>Marḥalah</Label>
          <Select value={marhalahId} onValueChange={(v) => setMarhalahIdOverride(v ?? "1")}>
            <SelectTrigger>
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
        </div>

        <div className="space-y-2">
          <Label>Topic Title</Label>
          <Input value={title} onChange={(e) => setTitleOverride(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Arabic Title (optional)</Label>
          <Input
            className="font-arabic"
            value={arabicTitle}
            onChange={(e) => setArabicTitleOverride(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Text Content</Label>
          <Textarea
            className="min-h-32"
            value={content}
            onChange={(e) => setContentOverride(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Arabic Content (optional)</Label>
          <Textarea
            className="min-h-24 font-arabic"
            value={arabicContent}
            onChange={(e) => setArabicContentOverride(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Examples (optional)</Label>
          <Input
            className="font-arabic"
            value={examples}
            onChange={(e) => setExamplesOverride(e.target.value)}
          />
        </div>

        {topic.audio_url && !audioFile && (
          <p className="text-xs text-muted-foreground">
            Current audio uploaded. Upload a new file to replace it.
          </p>
        )}

        <Card className="card-shadow">
          <CardContent className="p-4">
            <Label className="mb-2 block">Replace Audio (.mp3)</Label>
            {audioFile ? (
              <div className="flex items-center justify-between bg-emerald-light rounded-lg p-3">
                <span className="text-sm truncate">{audioFile.name}</span>
                <Button variant="ghost" size="icon" onClick={() => setAudioFile(null)}>
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer">
                <HugeiconsIcon icon={Upload01Icon} size={24} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tap to upload MP3</span>
                <input
                  type="file"
                  accept=".mp3,audio/mpeg"
                  className="hidden"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <Label className="mb-2 block">Replace PDF (Optional)</Label>
            {pdfFile ? (
              <div className="flex items-center justify-between bg-emerald-light rounded-lg p-3">
                <span className="text-sm truncate">{pdfFile.name}</span>
                <Button variant="ghost" size="icon" onClick={() => setPdfFile(null)}>
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer">
                <HugeiconsIcon icon={Upload01Icon} size={24} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tap to upload PDF</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 bg-emerald-deep hover:bg-emerald-mid text-cream"
          disabled={!title.trim() || !content.trim() || updateMutation.isPending}
          onClick={() => updateMutation.mutate()}
        >
          {updateMutation.isPending ? "Saving..." : "Update Lesson"}
        </Button>
      </div>
        </>
      )}
    </AppShell>
  );
}
