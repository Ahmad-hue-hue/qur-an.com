"use client";

import { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
  Download01Icon,
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "bg-emerald-deep rounded-2xl p-4 text-cream card-shadow",
        className
      )}
    >
      {src && <audio ref={audioRef} src={src} preload="metadata" />}
      {title && <p className="text-sm text-cream/80 mb-3">{title}</p>}

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
        >
          <HugeiconsIcon icon={Backward01Icon} size={20} />
        </Button>
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-gold text-emerald-deep hover:bg-gold/90"
          onClick={togglePlay}
        >
          <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} size={24} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-cream hover:bg-emerald-mid/50"
          onClick={() => seek(10)}
        >
          <HugeiconsIcon icon={Forward01Icon} size={20} />
        </Button>
        {src && (
          <a href={src} download className="ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-cream hover:bg-emerald-mid/50"
            >
              <HugeiconsIcon icon={Download01Icon} size={20} />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
