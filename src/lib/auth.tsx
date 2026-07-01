import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loginUser,
  signUp as apiSignUp,
  setCurrentUserEmail,
  type NewUserInput,
  type UserBoundary,
} from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Client-side auth: the signed-in user (from the stateless /users/login
// endpoint) is kept in state + localStorage and stamped onto every API call
// via setCurrentUserEmail. Roles: ADMIN | OPERATOR | END_USER.
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  email: string;
  systemID: string;
  role: string;
  username?: string;
  avatar?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (input: NewUserInput) => Promise<AuthUser>;
  logout: () => void;
}

const STORAGE_KEY = "spot-insight.auth";

function fromBoundary(b: UserBoundary): AuthUser {
  return {
    email: b.userId.email,
    systemID: b.userId.systemID,
    role: b.role,
    username: b.username,
    avatar: b.avatar,
  };
}

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = loadStoredUser();
    // stamp the API layer before the first data fetch
    setCurrentUserEmail(stored?.email ?? null);
    return stored;
  });

  useEffect(() => {
    setCurrentUserEmail(user?.email ?? null);
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: user?.role === "ADMIN",
      login: async (email, password) => {
        const u = fromBoundary(await loginUser(email, password));
        setUser(u);
        return u;
      },
      signup: async (input) => {
        await apiSignUp(input);
        const u = fromBoundary(await loginUser(input.email, input.password));
        setUser(u);
        return u;
      },
      logout: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
