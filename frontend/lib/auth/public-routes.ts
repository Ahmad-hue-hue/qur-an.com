const PUBLIC_PATHS = ["/login", "/register", "/admin/login"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function buildLoginRedirectPath(pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  const params = new URLSearchParams();
  if (next && next !== "/") {
    params.set("next", next);
  }
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
