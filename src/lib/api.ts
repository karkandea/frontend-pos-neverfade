import axios from "axios";
import { getActiveOutletId } from "./outlet";

export const TOKEN_KEY = "nfpos_token";

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || undefined;
const SHARED_SESSION_TOKEN_KEY = "nf_shared_session_token";
const SHARED_MODE_KEY = "nf_shared_mode";

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

  // Selection is validated against the authenticated user's outlet assignment on the API.
  // Omitting the header preserves the server-resolved default outlet for older clients.
  const activeOutletId = getActiveOutletId();
  if (activeOutletId && (
    config.url === "/api/transactions" || config.url?.startsWith("/api/transactions/") ||
    config.url === "/api/payments/current" || config.url?.startsWith("/api/payments/") ||
    config.url?.startsWith("/api/restaurant/") ||
    config.url?.startsWith("/api/laundry/")
  )) {
    config.headers.set("X-Outlet-Id", activeOutletId);
  }

  const method = config.method?.toLowerCase();
  const saleCreation =
    method === "post" &&
    (config.url === "/api/transactions" ||
      config.url === "/api/payments/qris");

  if (
    saleCreation &&
    config.data &&
    typeof config.data === "object" &&
    !Array.isArray(config.data)
  ) {
    const outletId = getActiveOutletId();
    if (outletId && !("outletId" in config.data)) {
      config.data = {
        ...config.data,
        outletId,
      };
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      const sharedSessionActive =
        localStorage.getItem(SHARED_MODE_KEY) === "1" &&
        Boolean(sessionStorage.getItem(SHARED_SESSION_TOKEN_KEY));

      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);

      if (sharedSessionActive) {
        sessionStorage.removeItem(SHARED_SESSION_TOKEN_KEY);
        window.location.replace("/shared-pos?reason=expired");
        return Promise.reject(error);
      }

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