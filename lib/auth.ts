import type { User } from './types';

const TOKEN_KEY = 'api_auth_token';
const USER_KEY = 'api_cached_user';

// In-memory cache for user (faster than localStorage parsing)
let cachedUser: User | null = null;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;

  // Try in-memory cache first
  if (cachedUser) return cachedUser;

  // Fall back to localStorage
  const stored = localStorage.getItem(USER_KEY);
  if (stored) {
    try {
      cachedUser = JSON.parse(stored);
      return cachedUser;
    } catch {
      return null;
    }
  }

  return null;
}

export function setCachedUser(user: User): void {
  if (typeof window === 'undefined') return;
  cachedUser = user;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearCachedUser(): void {
  if (typeof window === 'undefined') return;
  cachedUser = null;
  localStorage.removeItem(USER_KEY);
}

export function clearAuth(): void {
  clearToken();
  clearCachedUser();
}
