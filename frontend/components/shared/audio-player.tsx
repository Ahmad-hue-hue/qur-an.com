"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  Forward01Icon,
  Backward01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src?: string;
  title?: string;
  className?: string;
}

export function AudioPlayer({ src, title, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    setError(null);
    setReady(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    audio.src = src;
    audio.load();

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
        setReady(true);
      }
    };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      setError("Could not load audio. Try the download button instead.");
      setIsPlaying(false);
      setReady(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("canplay", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("canplay", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      setError("Tap play again to start audio.");
      setIsPlaying(false);
    }
  }, [src]);

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.duration, audio.currentTime + seconds)
    );
  };

  const formatTime = (t: number) => {
    if (!Number.isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!src) {
    return (
      <div
        className={cn(
          "bg-emerald-deep/60 rounded-2xl p-4 text-cream/70 card-shadow border border-dashed border-cream/20",
          className
        )}
      >
        {title && <p className="text-sm text-cream/80 mb-1">{title}</p>}
        <p className="text-xs">No audio uploaded for this lesson yet.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-emerald-deep rounded-2xl p-4 text-cream card-shadow",
        className
      )}
    >
      <audio ref={audioRef} preload="metadata" playsInline />

      {title && <p className="text-sm text-cream/80 mb-3">{title}</p>}

      {error && (
        <p className="text-xs text-gold mb-3" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs tabular-nums w-10">{formatTime(currentTime)}</span>
        <div className="flex-1 h-1.5 bg-emerald-mid/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs tabular-nums w-10 text-right">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-cream hover:bg-emerald-mid/50"
          onClick={() => seek(-10)}
          disabled={!ready}
        >
          <HugeiconsIcon icon={Backward01Icon} size={20} />
        </Button>
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-gold text-emerald-deep hover:bg-gold/90 btn-shadow sm:h-11 sm:w-11"
          onClick={() => void togglePlay()}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} size={24} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-cream hover:bg-emerald-mid/50"
          onClick={() => seek(10)}
          disabled={!ready}
        >
          <HugeiconsIcon icon={Forward01Icon} size={20} />
        </Button>
      </div>
    </div>
  );
}
