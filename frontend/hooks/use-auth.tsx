"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import {
  getDefaultRoute,
  getUserRole,
  isAuthenticated,
} from "@/lib/auth/token";

interface AuthContextValue {
  isReady: boolean;
  isLoggedIn: boolean;
  role: "student" | "admin" | null;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<"student" | "admin" | null>(null);

  const refreshAuth = useCallback(() => {
    const loggedIn = isAuthenticated();
    setIsLoggedIn(loggedIn);
    setRole(loggedIn ? getUserRole() : null);
    setIsReady(true);
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const logout = useCallback(() => {
    authApi.logout();
    setIsLoggedIn(false);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({ isReady, isLoggedIn, role, logout, refreshAuth }),
    [isReady, isLoggedIn, role, logout, refreshAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth(requiredRole?: "student" | "admin") {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isReady) return;
    if (!auth.isLoggedIn) {
      router.replace(requiredRole === "admin" ? "/admin/login" : "/login");
      return;
    }
    if (requiredRole === "admin" && auth.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    if (requiredRole === "student" && auth.role === "admin") {
      router.replace("/admin");
    }
  }, [auth.isReady, auth.isLoggedIn, auth.role, requiredRole, router]);

  return auth;
}

export function useGuestOnly(options?: { redirectIfSignedIn?: boolean }) {
  const router = useRouter();
  const auth = useAuth();
  const redirectIfSignedIn = options?.redirectIfSignedIn ?? true;

  useEffect(() => {
    if (!auth.isReady || !redirectIfSignedIn) return;
    if (auth.isLoggedIn) {
      router.replace(getDefaultRoute(auth.role));
    }
  }, [auth.isReady, auth.isLoggedIn, auth.role, router, redirectIfSignedIn]);

  return auth;
}
