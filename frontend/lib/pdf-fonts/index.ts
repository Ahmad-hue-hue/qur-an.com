import type { jsPDF } from "jspdf";

export const LATIN_FONT = "NotoSans";
export const ARABIC_FONT = "NotoNaskhArabic";

const ARABIC_RANGE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function containsArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

/** Font whose glyphs best cover the given text (Arabic script vs. Latin/diacritics). */
export function fontFor(text: string): string {
  return containsArabic(text) ? ARABIC_FONT : LATIN_FONT;
}

const FONT_FILES: Array<{ file: string; name: string; style: "normal" | "bold" }> = [
  { file: "NotoSans-Regular.ttf", name: LATIN_FONT, style: "normal" },
  { file: "NotoSans-Bold.ttf", name: LATIN_FONT, style: "bold" },
  { file: "NotoNaskhArabic-Regular.ttf", name: ARABIC_FONT, style: "normal" },
  { file: "NotoNaskhArabic-Bold.ttf", name: ARABIC_FONT, style: "bold" },
];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Embeds the Unicode fonts (Noto Sans for Latin/diacritics, Noto Naskh
 * Arabic for Arabic script) into this jsPDF instance's VFS, fetching the
 * .ttf files from /public/fonts at call time. jsPDF's VFS is per-document,
 * so this must run once per `new jsPDF(...)` instance.
 */
export async function registerPdfFonts(doc: jsPDF) {
  await Promise.all(
    FONT_FILES.map(async ({ file, name, style }) => {
      const response = await fetch(`/fonts/${file}`);
      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      doc.addFileToVFS(file, base64);
      doc.addFont(file, name, style);
    })
  );
}
