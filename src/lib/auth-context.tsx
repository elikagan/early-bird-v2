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
  // (early_access_market_ids was removed when the drop / pre-shop
  //  flow was retired.)
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
  loading: false,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: User | null;
}) {
  // Root layout reads the session cookie server-side and passes the
  // resolved user down. When present we skip the "loading" state —
  // that gate previously blanked every page for ~150-300ms while we
  // waited on /api/auth/me to respond.
  const [user, setUser] = useState<User | null>(initialUser);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("eb_token");
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

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

      // First-login sync of anonymous favorites. If the user stacked
      // up hearts while browsing signed-out, promote those localStorage
      // rows into real /api/favorites rows now that we know who they
      // are. Fire-and-forget — we don't want to block the UI on this.
      try {
        const { getAnonFavorites, clearAnonFavorites } = await import(
          "@/lib/anon-favorites"
        );
        const anonFavs = getAnonFavorites();
        if (anonFavs.size > 0) {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (stored) headers["Authorization"] = `Bearer ${stored}`;
          await Promise.all(
            Array.from(anonFavs).map((itemId) =>
              fetch("/api/favorites", {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify({ item_id: itemId }),
              }).catch(() => {})
            )
          );
          clearAnonFavorites();
        }
      } catch {
        // Dynamic import failed — skip silently, not worth blocking on.
      }
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
