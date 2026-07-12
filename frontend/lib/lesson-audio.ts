const LESSON_AUDIO_EXTENSIONS = ["mp3", "m4a"] as const;

export const LESSON_AUDIO_ACCEPT =
  ".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a,audio/m4a";

export const LESSON_AUDIO_LABEL = "MP3 or M4A";

export function isLessonAudioFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (
    ext &&
    LESSON_AUDIO_EXTENSIONS.includes(ext as (typeof LESSON_AUDIO_EXTENSIONS)[number])
  ) {
    return true;
  }

  const type = file.type.toLowerCase();
  return (
    type === "audio/mpeg" ||
    type === "audio/mp3" ||
    type === "audio/mp4" ||
    type === "audio/x-m4a" ||
    type === "audio/m4a"
  );
}

export function resolveLessonAudioContentType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "m4a") return file.type || "audio/mp4";
  if (ext === "mp3") return file.type || "audio/mpeg";
  if (file.type) return file.type;
  return "audio/mpeg";
}

export function audioExtensionFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes(".m4a")) return "m4a";
  if (lower.includes(".mp3")) return "mp3";
  return "audio";
}
