"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TAJWEED_LOGO_SRC } from "@/components/auth/login-logo";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "tajweed-install-dismissed-session";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  if (isIOS()) return "ios";
  if (isAndroid()) return "android";
  return "desktop";
}

function shouldShowInstallPrompt() {
  if (typeof window === "undefined") return false;
  if (isStandalone()) return false;
  if (sessionStorage.getItem(DISMISS_KEY) === "1") return false;
  return true;
}

function installHint(platform: "ios" | "android" | "desktop", canNativeInstall: boolean) {
  if (platform === "ios") return "Share → Add to Home Screen";
  if (canNativeInstall) return "Install for quick access";
  if (platform === "android") return "Menu → Install app";
  return "Install from the address bar";
}

export function InstallAppPrompt() {
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [platform] = useState(detectPlatform);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        sessionStorage.setItem(DISMISS_KEY, "1");
        setOpen(false);
      }
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }, [deferredPrompt]);

  useEffect(() => {
    if (!shouldShowInstallPrompt()) return;

    const timer = window.setTimeout(() => setOpen(true), 0);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  if (typeof window !== "undefined" && isStandalone()) return null;
  if (!open) return null;

  const canNativeInstall = Boolean(deferredPrompt);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2",
        "animate-in fade-in-0 slide-in-from-top-4 duration-300"
      )}
      role="region"
      aria-label="Install app"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-lg backdrop-blur-md">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-emerald-deep/10">
          <Image
            src={TAJWEED_LOGO_SRC}
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            Install Tajweed Classes
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {installHint(platform, canNativeInstall)}
          </p>
        </div>

        {canNativeInstall && (
          <Button
            size="sm"
            className="btn-emerald h-8 shrink-0 px-3 text-xs"
            disabled={installing}
            onClick={() => void install()}
          >
            {installing ? "..." : "Install"}
          </Button>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss install prompt"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
