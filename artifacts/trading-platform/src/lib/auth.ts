const TOKEN_KEY = "expresspro_token";
const USER_ID_KEY = "expresspro_user_id";
const USER_ROLE_KEY = "expresspro_role";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function getRole(): string | null {
  return localStorage.getItem(USER_ROLE_KEY);
}

export function setAuth(token: string, userId: string, role: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(USER_ROLE_KEY, role);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken() || !!getUserId();
}
