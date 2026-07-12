"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TAJWEED_LOGO_SRC } from "@/components/auth/login-logo";

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
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function detectPlatform(): "ios" | "android" | "desktop" {
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

  if (isStandalone()) return null;

  const canNativeInstall = Boolean(deferredPrompt);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-full ring-1 ring-emerald-deep/10">
            <Image
              src={TAJWEED_LOGO_SRC}
              alt="Tajweed Classes"
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <DialogTitle>Install Tajweed Classes</DialogTitle>
          <DialogDescription>
            Add the app to your home screen for quick access, full-screen
            learning, and a native app feel.
          </DialogDescription>
        </DialogHeader>

        {platform === "ios" && (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Tap the Share button in Safari (square with arrow up).</li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong> in the top right.
            </li>
          </ol>
        )}

        {platform === "android" && !canNativeInstall && (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Open the browser menu (three dots).</li>
            <li>
              Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </li>
            <li>Confirm to add Tajweed Classes.</li>
          </ol>
        )}

        {platform === "desktop" && !canNativeInstall && (
          <p className="text-sm text-muted-foreground">
            Look for the install icon in your browser address bar, or open the
            browser menu and choose <strong>Install Tajweed Classes</strong>.
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-center">
          {canNativeInstall && (
            <Button
              className="btn-emerald w-full sm:w-auto"
              disabled={installing}
              onClick={() => void install()}
            >
              {installing ? "Installing..." : "Install now"}
            </Button>
          )}
          <Button variant="outline" className="w-full sm:w-auto" onClick={dismiss}>
            {canNativeInstall ? "Not now" : "Got it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
