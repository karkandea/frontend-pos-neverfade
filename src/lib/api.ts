import axios from "axios";

export const TOKEN_KEY = "nfpos_token";

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || undefined;

export class ApiNetworkError extends Error {
  code: string;
  originalMessage: string;

  constructor(code: string, originalMessage: string) {
    super("Gagal terhubung ke server. Coba lagi.");
    this.name = "ApiNetworkError";
    this.code = code;
    this.originalMessage = originalMessage;
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem(TOKEN_KEY) ??
    sessionStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.replace("/login");
    }

    if (
      status === 403 &&
      error?.response?.data?.code === "TENANT_SUSPENDED"
    ) {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("tenant-session-invalidated"));
      window.location.replace("/login?reason=suspended");
    }

    if (!error.response) {
      return Promise.reject(
        new ApiNetworkError(
          typeof error?.code === "string" ? error.code : "",
          typeof error?.message === "string" ? error.message : ""
        )
      );
    }

    return Promise.reject(error);
  }
);

export default api;
