"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDefaultRoute, getUserRole, isAuthenticated } from "@/lib/auth/token";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace(getDefaultRoute(getUserRole()));
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
