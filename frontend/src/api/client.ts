// src/api/client.ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL ?? "/api/v1",
  withCredentials: false,
});
