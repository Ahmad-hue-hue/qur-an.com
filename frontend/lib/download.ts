/** Build a Supabase storage URL that forces file download (Content-Disposition: attachment). */
export function getStorageDownloadUrl(url: string, filename: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("download", filename);
  return parsed.toString();
}

export function filenameFromStorageUrl(url: string, fallback: string): string {
  try {
    const segment = new URL(url).pathname.split("/").pop();
    if (segment && segment.includes(".")) {
      return decodeURIComponent(segment);
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function sanitizeDownloadName(name: string, ext: string): string {
  const base = name
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return base ? `${base}.${ext}` : `download.${ext}`;
}

/** Download a Supabase storage file (works on mobile; avoids cross-origin download attribute issues). */
export async function downloadStorageFile(
  url: string,
  filename: string
): Promise<void> {
  const downloadUrl = getStorageDownloadUrl(url, filename);

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.location.assign(downloadUrl);
  }
}
