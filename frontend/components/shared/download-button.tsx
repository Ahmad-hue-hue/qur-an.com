"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  filenameFromStorageUrl,
  getStorageDownloadUrl,
  sanitizeDownloadName,
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
  const href = getStorageDownloadUrl(url, resolvedName);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant }),
        fullWidth && "w-full gap-2",
        "inline-flex items-center justify-center",
        className
      )}
    >
      <HugeiconsIcon icon={Download01Icon} size={18} />
      {label}
    </a>
  );
}
