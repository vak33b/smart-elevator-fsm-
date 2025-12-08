// src/context/AuthContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { message } from "antd";
import { loginUser, registerUser, RegisterPayload, User } from "../api/auth";
import { apiClient } from "../api/client";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "smartElevator.token";
const USER_KEY = "smartElevator.user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Инициализация из localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken) {
      setToken(storedToken);
      apiClient.defaults.headers.common["Authorization"] =
        `Bearer ${storedToken}`;
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    setLoading(false);
  }, []);

  const saveAuth = (newToken: string | null, newUser: User | null) => {
    setToken(newToken);
    setUser(newUser);

    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      apiClient.defaults.headers.common["Authorization"] =
        `Bearer ${newToken}`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      delete apiClient.defaults.headers.common["Authorization"];
    }

    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  };

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const tokenResp = await loginUser(email, password);
        // Информации о пользователе логин не возвращает,
        // поэтому оставляем user как есть (если он уже был) или null.
        saveAuth(tokenResp.access_token, user ?? null);
        message.success("Успешный вход");
      } catch (e: any) {
        console.error(e);
        message.error(
          e?.response?.data?.detail ?? "Не удалось авторизоваться"
        );
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    setLoading(true);
    try {
      const createdUser = await registerUser(payload);
      message.success("Регистрация прошла успешно");
      // Можно сразу авторизовать: user сохраняем, токена пока нет
      saveAuth(null, createdUser);
    } catch (e: any) {
      console.error(e);
      message.error(
        e?.response?.data?.detail ?? "Не удалось зарегистрировать пользователя"
      );
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    saveAuth(null, null);
    message.info("Вы вышли из системы");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
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
