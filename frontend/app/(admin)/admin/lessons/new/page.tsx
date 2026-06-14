"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  TextBoldIcon,
  TextItalicIcon,
  LeftToRightListBulletIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function AddLessonPage() {
  const router = useRouter();
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null);

  const handleSave = () => {
    toast.success("Lesson saved successfully!");
    router.push("/admin/topics");
  };

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

      <div className="px-4 py-6 space-y-5">
        <div className="space-y-2">
          <Label>Marḥalah</Label>
          <Select defaultValue="1">
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
          <Input placeholder="e.g. Idh-har Al-Halqi" />
        </div>

        <div className="space-y-2">
          <Label>Arabic Title (optional)</Label>
          <Input placeholder="الإظهار الحلقي" className="font-arabic" />
        </div>

        <div className="space-y-2">
          <Label>Text Content</Label>
          <div className="border rounded-xl overflow-hidden card-shadow">
            <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HugeiconsIcon icon={TextBoldIcon} size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HugeiconsIcon icon={TextItalicIcon} size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HugeiconsIcon icon={LeftToRightListBulletIcon} size={16} />
              </Button>
            </div>
            <Textarea
              placeholder="Write lesson content with Arabic support..."
              className="border-0 rounded-none min-h-40 font-arabic"
            />
          </div>
        </div>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <Label className="mb-2 block">Upload Audio (.mp3)</Label>
            {audioFile ? (
              <div className="flex items-center justify-between bg-emerald-light rounded-lg p-3">
                <span className="text-sm truncate">{audioFile}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAudioFile(null)}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-emerald-mid/50 transition-colors">
                <HugeiconsIcon
                  icon={Upload01Icon}
                  size={24}
                  className="text-muted-foreground"
                />
                <span className="text-sm text-muted-foreground">
                  Tap to upload MP3
                </span>
                <input
                  type="file"
                  accept=".mp3,audio/mpeg"
                  className="hidden"
                  onChange={(e) =>
                    setAudioFile(e.target.files?.[0]?.name || null)
                  }
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
                <span className="text-sm truncate">{pdfFile}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPdfFile(null)}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-emerald-mid/50 transition-colors">
                <HugeiconsIcon
                  icon={Upload01Icon}
                  size={24}
                  className="text-muted-foreground"
                />
                <span className="text-sm text-muted-foreground">
                  Tap to upload PDF
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) =>
                    setPdfFile(e.target.files?.[0]?.name || null)
                  }
                />
              </label>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 bg-emerald-deep hover:bg-emerald-mid text-cream"
          onClick={handleSave}
        >
          Save Lesson
        </Button>
      </div>
    </AppShell>
  );
}
