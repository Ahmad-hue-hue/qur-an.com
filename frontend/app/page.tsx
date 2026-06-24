"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getDefaultRoute } from "@/lib/auth/token";

export default function HomePage() {
  const router = useRouter();
  const { isReady, isLoggedIn, role } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (isLoggedIn) {
      router.replace(getDefaultRoute(role));
    } else {
      router.replace("/login");
    }
  }, [isReady, isLoggedIn, role, router]);

  return null;
}
