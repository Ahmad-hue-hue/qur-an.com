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
  setRole: (role: AppRole) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveRole(session: Session | null): Promise<AppRole> {
  if (!session?.user) return null;

  const metaRole = session.user.user_metadata?.role;
  if (metaRole === "admin" || metaRole === "student") {
    return metaRole;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve profile role:", error.message);
    return null;
  }

  if (data?.role === "admin" || data?.role === "student") {
    return data.role;
  }

  return "student";
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

  const setRoleDirect = useCallback((nextRole: AppRole) => {
    setRole(nextRole);
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      isLoggedIn,
      role,
      logout,
      refreshAuth,
      setRole: setRoleDirect,
    }),
    [isReady, isLoggedIn, role, logout, refreshAuth, setRoleDirect]
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
    if (requiredRole === "admin") {
      if (auth.role === "student") {
        router.replace("/dashboard");
      }
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
