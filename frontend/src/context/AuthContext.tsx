// src/context/AuthContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient } from "../api/client";
import { fetchCurrentUser } from "../api/auth";
import type { UserRole } from "../api/auth";

interface AuthUser {
  id?: number;
  email?: string;
  full_name?: string | null;
  role?: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: { token: string; user?: AuthUser }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

const TOKEN_KEY = "smartElevator.token";
const ROLE_KEY = "smartElevator.role";
const USER_KEY = "smartElevator.user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUserRaw = localStorage.getItem(USER_KEY);
    const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null;

    if (storedToken) {
      setToken(storedToken);
      apiClient.defaults.headers.common["Authorization"] =
        `Bearer ${storedToken}`;
    }

    if (storedUserRaw) {
      try {
        const parsed = JSON.parse(storedUserRaw) as AuthUser;
        setUser(parsed);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    } else if (storedRole) {
      setUser({ role: storedRole });
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(
    ({ token: newToken, user: newUser }: { token: string; user?: AuthUser }) => {
      setToken(newToken);
      localStorage.setItem(TOKEN_KEY, newToken);
      apiClient.defaults.headers.common["Authorization"] =
        `Bearer ${newToken}`;

      if (newUser) {
        setUser(newUser);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        if (newUser.role) {
          localStorage.setItem(ROLE_KEY, newUser.role);
        }
      } else {
        setUser(null);
        localStorage.removeItem(USER_KEY);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);
    delete apiClient.defaults.headers.common["Authorization"];
  }, []);

  useEffect(() => {
    const interceptorId = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.response.eject(interceptorId);
    };
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchCurrentUser()
      .then((u) => {
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        if (u.role) {
          localStorage.setItem(ROLE_KEY, u.role);
        }
      })
      .catch(() => {
        logout();
      })
      .finally(() => setIsLoading(false));
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
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
