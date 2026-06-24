"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
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

export default function AddLessonPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [marhalahId, setMarhalahId] = useState("1");
  const [title, setTitle] = useState("");
  const [arabicTitle, setArabicTitle] = useState("");
  const [content, setContent] = useState("");
  const [arabicContent, setArabicContent] = useState("");
  const [examples, setExamples] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const { data: existingTopics } = useQuery({
    queryKey: ["admin-topics", marhalahId],
    queryFn: () => adminApi.getTopics(parseInt(marhalahId)),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder =
        (existingTopics?.reduce((max, t) => Math.max(max, t.order), 0) ?? 0) + 1;
      return adminApi.createTopic({
        marhalah: parseInt(marhalahId),
        order: nextOrder,
        title,
        arabic_title: arabicTitle,
        content,
        arabic_content: arabicContent,
        examples,
        audio: audioFile,
        pdf: pdfFile,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topics"] });
      toast.success("Lesson saved successfully!");
      router.push("/admin/topics");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save lesson"),
  });

  const canSave = title.trim() && content.trim();

  return (
    <AppShell variant="admin">
      <PageHeader title="Add New Lesson">
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
          <Select value={marhalahId} onValueChange={(v) => setMarhalahId(v ?? "1")}>
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
          <Input
            placeholder="e.g. Idh-har Al-Halqi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Arabic Title (optional)</Label>
          <Input
            placeholder="الإظهار الحلقي"
            className="font-arabic"
            value={arabicTitle}
            onChange={(e) => setArabicTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Text Content</Label>
          <Textarea
            placeholder="Write lesson content..."
            className="min-h-32"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Arabic Content (optional)</Label>
          <Textarea
            placeholder="المحتوى بالعربية..."
            className="min-h-24 font-arabic"
            value={arabicContent}
            onChange={(e) => setArabicContent(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Examples (optional)</Label>
          <Input
            placeholder="مِنْ عِلْمٍ — مِنْ هَادٍ"
            className="font-arabic"
            value={examples}
            onChange={(e) => setExamples(e.target.value)}
          />
        </div>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <Label className="mb-2 block">Upload Audio (.mp3)</Label>
            {audioFile ? (
              <div className="flex items-center justify-between bg-emerald-light rounded-lg p-3">
                <span className="text-sm truncate">{audioFile.name}</span>
                <Button variant="ghost" size="icon" onClick={() => setAudioFile(null)}>
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-emerald-mid/50 transition-colors">
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
            <Label className="mb-2 block">Upload PDF (Optional)</Label>
            {pdfFile ? (
              <div className="flex items-center justify-between bg-emerald-light rounded-lg p-3">
                <span className="text-sm truncate">{pdfFile.name}</span>
                <Button variant="ghost" size="icon" onClick={() => setPdfFile(null)}>
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-emerald-mid/50 transition-colors">
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
          disabled={!canSave || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Saving..." : "Save Lesson"}
        </Button>
      </div>
    </AppShell>
  );
}
