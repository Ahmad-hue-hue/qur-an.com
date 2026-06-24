export function getDefaultRoute(role: "student" | "admin" | null): string {
  return role === "admin" ? "/admin" : "/dashboard";
}

// Legacy helpers kept for any remaining imports — auth is Supabase session based.
export function isAuthenticated(): boolean {
  return false;
}

export function getUserRole(): "student" | "admin" | null {
  return null;
}

export function clearTokens() {}
export function setTokens() {}
export function getAccessToken(): string | null {
  return null;
}
