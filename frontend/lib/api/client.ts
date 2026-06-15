import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/token";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    setTokens(data.access, refresh);
    return true;
  } catch {
    return false;
  }
}

function formatErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  if (Array.isArray(obj.detail)) return obj.detail.join(", ");
  if (typeof obj.non_field_errors === "object" && Array.isArray(obj.non_field_errors)) {
    return obj.non_field_errors.join(", ");
  }
  const messages = Object.entries(obj).flatMap(([key, val]) => {
    if (Array.isArray(val)) return val.map((item) => `${key}: ${String(item)}`);
    if (typeof val === "string") return [`${key}: ${val}`];
    return [];
  });
  if (messages.length) return messages.join(", ");
  return "Request failed";
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      "Cannot reach the server. Make sure the backend is running on port 8000."
    );
  }

  if (response.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiClient<T>(endpoint, options, false);
    clearTokens();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "Session expired");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, formatErrorMessage(data), data);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function apiUpload<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = { ...getAuthHeaders() };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, formatErrorMessage(data), data);
  }

  return response.json();
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function unwrapList<T>(data: T[] | PaginatedResponse<T> | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}
