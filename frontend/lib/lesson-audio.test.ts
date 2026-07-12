import { describe, expect, test } from "bun:test";
import {
  audioExtensionFromUrl,
  isLessonAudioFile,
  resolveLessonAudioContentType,
} from "@/lib/lesson-audio";

describe("isLessonAudioFile", () => {
  test("accepts mp3 by extension", () => {
    expect(isLessonAudioFile({ name: "lesson.mp3", type: "" } as File)).toBe(true);
  });

  test("accepts m4a by extension", () => {
    expect(isLessonAudioFile({ name: "lesson.m4a", type: "" } as File)).toBe(true);
  });

  test("rejects pdf", () => {
    expect(
      isLessonAudioFile({ name: "notes.pdf", type: "application/pdf" } as File)
    ).toBe(false);
  });
});

describe("resolveLessonAudioContentType", () => {
  test("uses audio/mp4 for m4a", () => {
    expect(
      resolveLessonAudioContentType({ name: "lesson.m4a", type: "" } as File)
    ).toBe("audio/mp4");
  });

  test("uses audio/mpeg for mp3", () => {
    expect(
      resolveLessonAudioContentType({ name: "lesson.mp3", type: "" } as File)
    ).toBe("audio/mpeg");
  });
});

describe("audioExtensionFromUrl", () => {
  test("detects m4a", () => {
    expect(
      audioExtensionFromUrl(
        "https://example.com/storage/v1/object/public/lesson-audio/topics/1/1.m4a"
      )
    ).toBe("m4a");
  });

  test("detects mp3", () => {
    expect(
      audioExtensionFromUrl(
        "https://example.com/storage/v1/object/public/lesson-audio/topics/1/1.mp3"
      )
    ).toBe("mp3");
  });
});
