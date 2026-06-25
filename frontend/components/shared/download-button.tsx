"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  filenameFromStorageUrl,
  sanitizeDownloadName,
  downloadStorageFile,
} from "@/lib/download";
import { cn } from "@/lib/utils";

interface DownloadButtonProps {
  url?: string;
  filename?: string;
  label?: string;
  className?: string;
  variant?: "outline" | "ghost";
  fullWidth?: boolean;
  tone?: "default" | "gold";
}

const toneClasses = {
  default: "",
  gold: "border-gold bg-gold text-emerald-deep hover:bg-gold/90 hover:text-emerald-deep",
};

export function DownloadButton({
  url,
  filename,
  label = "Download",
  className,
  variant = "outline",
  fullWidth = false,
  tone = "default",
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  if (!url) {
    return (
      <Button
        variant={variant}
        className={cn(
          fullWidth && "w-full gap-2",
          toneClasses[tone],
          tone === "gold" && "opacity-60",
          className
        )}
        disabled
      >
        <HugeiconsIcon icon={Download01Icon} size={18} />
        <span className="truncate">{label}</span>
      </Button>
    );
  }

  const ext = url.includes(".pdf") ? "pdf" : url.includes(".mp3") ? "mp3" : "file";
  const resolvedName =
    filename ??
    filenameFromStorageUrl(url, sanitizeDownloadName(label, ext));

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadStorageFile(url, resolvedName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      className={cn(
        fullWidth && "w-full gap-2",
        toneClasses[tone],
        className
      )}
      disabled={downloading}
      onClick={() => void handleDownload()}
    >
      <HugeiconsIcon icon={Download01Icon} size={18} />
      <span className="truncate">
        {downloading ? "Downloading..." : label}
      </span>
    </Button>
  );
}
