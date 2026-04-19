import { getToken, clearAuth } from "./auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Admin routes — token already contains admin flag in DB session
  void path; // token-based auth handles admin access

  const res = await fetch(`${BASE}/api${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    clearAuth();
    window.location.href = BASE + "/auth/login";
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    let errorMsg = `API error ${res.status}`;
    try {
      const body = await res.json();
      errorMsg = body.error || body.message || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),
};
