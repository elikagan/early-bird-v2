"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface User {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_dealer: number;
  dealer_id: string | null;
  business_name: string | null;
  instagram_handle: string | null;
  // Markets this buyer has been granted pre-drop access to via the
  // /early/[market-id] flow. Lets /buy and item pages skip the
  // pre-drop countdown for these markets.
  early_access_market_ids?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize token from localStorage synchronously to avoid flash-redirect
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("eb_token");
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    // Clear cookie via API (httpOnly cookie can't be cleared client-side)
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    try { localStorage.removeItem("eb_token"); } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = typeof window !== "undefined"
      ? localStorage.getItem("eb_token")
      : null;

    // Even without a localStorage token, the HTTP-only cookie may carry
    // the session — so we always attempt the /me call.
    try {
      const res = await fetch("/api/auth/me", {
        headers: stored ? { Authorization: `Bearer ${stored}` } : {},
        credentials: "include", // send HTTP-only cookie
      });
      if (res.status === 401) {
        // Server explicitly says "no valid session" — clear local state
        try { localStorage.removeItem("eb_token"); } catch {}
        setToken(null);
        setUser(null);
        return;
      }
      if (!res.ok) {
        // Non-401 server error — do NOT log out. Might be a transient 500.
        return;
      }
      const userData = await res.json();
      setUser(userData);
      if (stored) setToken(stored);
    } catch {
      // Network error (offline, DNS fail, etc.) — do NOT log out.
      // The cookie is still there; we'll pick them up on the next load.
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem("eb_token", newToken);
    setToken(newToken);
    setUser(newUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
