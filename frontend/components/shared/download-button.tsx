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
}

export function DownloadButton({
  url,
  filename,
  label = "Download",
  className,
  variant = "outline",
  fullWidth = false,
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  if (!url) {
    return (
      <Button
        variant={variant}
        className={cn(fullWidth && "w-full gap-2", className)}
        disabled
      >
        <HugeiconsIcon icon={Download01Icon} size={18} />
        {label} (not available)
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
      className={cn(fullWidth && "w-full gap-2", className)}
      disabled={downloading}
      onClick={() => void handleDownload()}
    >
      <HugeiconsIcon icon={Download01Icon} size={18} />
      {downloading ? "Downloading..." : label}
    </Button>
  );
}
