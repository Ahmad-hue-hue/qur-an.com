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
import type { Session } from "@supabase/supabase-js";
import { authApi } from "@/lib/api";
import { getSupabase } from "@/lib/supabase/client";
import { getDefaultRoute } from "@/lib/auth/token";

type AppRole = "student" | "admin" | null;

interface AuthContextValue {
  isReady: boolean;
  isLoggedIn: boolean;
  role: AppRole;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveRole(session: Session | null): Promise<AppRole> {
  if (!session?.user) return null;
  const supabase = getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  return (data?.role as AppRole) ?? "student";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<AppRole>(null);

  const syncSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setIsLoggedIn(false);
      setRole(null);
      setIsReady(true);
      return;
    }
    const nextRole = await resolveRole(session);
    setIsLoggedIn(true);
    setRole(nextRole);
    setIsReady(true);
  }, []);

  const refreshAuth = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    await syncSession(data.session);
  }, [syncSession]);

  useEffect(() => {
    const supabase = getSupabase();

    void supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    return () => subscription.unsubscribe();
  }, [syncSession]);

  const logout = useCallback(() => {
    void authApi.logout().finally(() => {
      setIsLoggedIn(false);
      setRole(null);
    });
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      isLoggedIn,
      role,
      logout,
      refreshAuth,
    }),
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
      router.replace("/login");
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
