// src/context/AuthContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Centralised auth context.
// authService.getCurrentUser() is called ONCE here inside useEffect —
// never during render — eliminating the "authService is not defined" crash.
//
// Usage:
//   // App root:
//   <AuthProvider><App /></AuthProvider>
//
//   // Anywhere in the tree:
//   const { user, loading, refresh } = useAuth();
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import type { AuthUser } from '@/types/api.types';
import { authService } from '@/api/services';

// ── Shape ─────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  /** Null while loading or unauthenticated */
  user: AuthUser | null;
  /** True on first mount while we resolve the session */
  loading: boolean;
  /** Call after login / profile update to re-read the user */
  refresh: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: () => undefined,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * The backend `AuthUser` does not include a `name` field.
 * We compute it once here so the rest of the app can always use `user.name`.
 */
function normaliseUser(raw: AuthUser | null): AuthUser | null {
  if (!raw) return null;
  return {
    ...raw,
    name: raw.name ?? `${raw.firstName} ${raw.lastName}`.trim(),
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const resolve = useCallback(() => {
    setLoading(true);
    try {
      // authService.getCurrentUser() reads from localStorage / in-memory token.
      // Safe to call only after hydration (i.e. in useEffect).
      const raw = authService.getCurrentUser() as AuthUser | null;
      setUser(normaliseUser(raw));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    resolve();
  }, [resolve]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, refresh: resolve }),
    [user, loading, resolve],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}