// src/context/AuthContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient } from "../api/client";
import type { UserRole } from "../api/auth";

interface AuthUser {
  role?: UserRole;
  email?: string;
  full_name?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, role?: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

const TOKEN_KEY = "smartElevator.token";
const ROLE_KEY = "smartElevator.role";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedRole = localStorage.getItem(ROLE_KEY) as
      | UserRole
      | null;

    if (storedToken) {
      setToken(storedToken);
      apiClient.defaults.headers.common["Authorization"] =
        `Bearer ${storedToken}`;
    }

    if (storedRole) {
      setUser({ role: storedRole });
    }
  }, []);

  const login = useCallback((newToken: string, role?: UserRole) => {
    setToken(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    apiClient.defaults.headers.common["Authorization"] =
      `Bearer ${newToken}`;

    if (role) {
      setUser({ role });
      localStorage.setItem(ROLE_KEY, role);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    delete apiClient.defaults.headers.common["Authorization"];
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  }
  return ctx;
};
