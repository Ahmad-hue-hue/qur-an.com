"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
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

type AuthSnapshot = {
  version: number;
  isReady: boolean;
  isLoggedIn: boolean;
  role: "student" | "admin" | null;
};

const authStore = (() => {
  let version = 0;
  let cachedSnapshot: AuthSnapshot = {
    version: 0,
    isReady: false,
    isLoggedIn: false,
    role: null,
  };
  const listeners = new Set<() => void>();

  function buildSnapshot(): AuthSnapshot {
    if (typeof window === "undefined") {
      return { version, isReady: false, isLoggedIn: false, role: null };
    }
    const loggedIn = isAuthenticated();
    return {
      version,
      isReady: true,
      isLoggedIn: loggedIn,
      role: loggedIn ? getUserRole() : null,
    };
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      const next = buildSnapshot();
      if (
        cachedSnapshot.version === next.version &&
        cachedSnapshot.isReady === next.isReady &&
        cachedSnapshot.isLoggedIn === next.isLoggedIn &&
        cachedSnapshot.role === next.role
      ) {
        return cachedSnapshot;
      }
      cachedSnapshot = next;
      return cachedSnapshot;
    },
    getServerSnapshot() {
      return { version: 0, isReady: false, isLoggedIn: false, role: null };
    },
    notify() {
      version += 1;
      listeners.forEach((listener) => listener());
    },
  };
})();

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot
  );

  const refreshAuth = useCallback(() => {
    authStore.notify();
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    authStore.notify();
  }, []);

  const value = useMemo(
    () => ({
      isReady: snapshot.isReady,
      isLoggedIn: snapshot.isLoggedIn,
      role: snapshot.role,
      logout,
      refreshAuth,
    }),
    [snapshot.isReady, snapshot.isLoggedIn, snapshot.role, logout, refreshAuth]
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
