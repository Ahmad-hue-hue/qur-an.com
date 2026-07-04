"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { authApi } from "@/lib/api";
import {
  clearBrowserSessionMarker,
  ensureActiveBrowserSession,
  markBrowserSessionActive,
} from "@/lib/auth/browser-session";
import { getDefaultRoute } from "@/lib/auth/token";
import { getSupabase } from "@/lib/supabase/client";
import { fetchUserRole, roleFromUser, type AppRole } from "@/lib/supabase/role";

interface AuthContextValue {
  isReady: boolean;
  isLoggedIn: boolean;
  role: AppRole | null;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  completeLogin: (role: AppRole, userId?: string) => void;
  setRole: (role: AppRole | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);
  const recentLoginAtRef = useRef(0);

  const syncSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      sessionUserIdRef.current = null;
      setIsLoggedIn(false);
      setRole(null);
      setIsReady(true);
      return;
    }

    const userId = session.user.id;
    const quickRole = roleFromUser(session.user);

    if (sessionUserIdRef.current === userId && quickRole) {
      setIsLoggedIn(true);
      setRole(quickRole);
      setIsReady(true);
      return;
    }

    sessionUserIdRef.current = userId;

    const supabase = getSupabase();
    const nextRole =
      quickRole ?? (await fetchUserRole(supabase, userId, session.user));

    setIsLoggedIn(true);
    setRole(nextRole);
    setIsReady(true);
  }, []);

  const refreshAuth = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    await syncSession(data.session);
  }, [syncSession]);

  const completeLogin = useCallback((nextRole: AppRole, userId?: string) => {
    markBrowserSessionActive();
    if (userId) sessionUserIdRef.current = userId;
    recentLoginAtRef.current = Date.now();
    setIsLoggedIn(true);
    setRole(nextRole);
    setIsReady(true);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    const init = async () => {
      await ensureActiveBrowserSession();
      if (!mounted) return;

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await syncSession(data.session);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && Date.now() - recentLoginAtRef.current < 5000) {
        return;
      }
      void syncSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const logout = useCallback(() => {
    clearBrowserSessionMarker();
    sessionUserIdRef.current = null;
    recentLoginAtRef.current = 0;
    void authApi.logout().finally(() => {
      setIsLoggedIn(false);
      setRole(null);
    });
  }, []);

  const setRoleDirect = useCallback((nextRole: AppRole | null) => {
    setRole(nextRole);
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      isLoggedIn,
      role,
      logout,
      refreshAuth,
      completeLogin,
      setRole: setRoleDirect,
    }),
    [isReady, isLoggedIn, role, logout, refreshAuth, completeLogin, setRoleDirect]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth(requiredRole?: AppRole) {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isReady) return;

    if (!auth.isLoggedIn) {
      const next =
        requiredRole === "admin"
          ? "/login?next=/admin"
          : requiredRole === "teacher"
            ? "/login?next=/teacher"
            : "/login";
      router.replace(next);
      return;
    }

    if (requiredRole === "student" && auth.role !== "student") {
      router.replace(getDefaultRoute(auth.role));
    }

    if (requiredRole === "admin" && auth.role !== "admin") {
      router.replace(getDefaultRoute(auth.role));
    }

    if (requiredRole === "teacher" && auth.role !== "teacher") {
      router.replace(getDefaultRoute(auth.role));
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
