export function getDefaultRoute(role: "student" | "admin" | "teacher" | null): string {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  return "/dashboard";
}

// Legacy helpers kept for any remaining imports — auth is Supabase session based.
export function isAuthenticated(): boolean {
  return false;
}

export function getUserRole(): "student" | "admin" | "teacher" | null {
  return null;
}

export function clearTokens() {}
export function setTokens() {}
export function getAccessToken(): string | null {
  return null;
}
