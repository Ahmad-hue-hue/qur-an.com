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
