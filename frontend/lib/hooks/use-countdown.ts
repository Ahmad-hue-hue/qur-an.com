"use client";

import { useSyncExternalStore } from "react";

function getRemainingSeconds(deadlineMs: number): number {
  return Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
}

function subscribeToCountdown(onStoreChange: () => void): () => void {
  const timer = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(timer);
}

export function useCountdown(deadlineAt?: string | null): number | null {
  const deadlineMs = deadlineAt ? new Date(deadlineAt).getTime() : null;

  return useSyncExternalStore(
    (onStoreChange) => {
      if (deadlineMs == null) return () => {};
      return subscribeToCountdown(onStoreChange);
    },
    () => (deadlineMs == null ? null : getRemainingSeconds(deadlineMs)),
    () => null
  );
}
