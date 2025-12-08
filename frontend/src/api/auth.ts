// src/api/auth.ts
import { apiClient } from "./client";

// ----- Типы -----

export type UserRole = "student" | "teacher";

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterPayload {
  email: string;
  full_name?: string;
  role: UserRole;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ----- Чистые функции -----

export async function registerUser(
  payload: RegisterPayload
): Promise<User> {
  const { data } = await apiClient.post<User>("/auth/register", payload);
  return data;
}

// Бэк ждёт email/password как query-параметры
export async function loginUser(
  email: string,
  password: string
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>(
    "/auth/login",
    null,
    { params: { email, password } }
  );
  return data;
}

// ----- Обёртка для страниц -----

export const authApi = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    return loginUser(payload.email, payload.password);
  },

  async register(payload: RegisterPayload): Promise<User> {
    return registerUser(payload);
  },
};

export type LoginResponse = TokenResponse;
