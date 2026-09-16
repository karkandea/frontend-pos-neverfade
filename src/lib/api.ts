import axios from "axios";

export const TOKEN_KEY = "nfpos_token";
export const DEMO_TOKEN_KEY = "nfpos_demo_token";
export const DEMO_SESSION_KEY = "nfpos_demo_session";

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || undefined;
const SHARED_SESSION_TOKEN_KEY = "nf_shared_session_token";
const SHARED_MODE_KEY = "nf_shared_mode";

export function getActiveTenantToken() {
  const demoSessionActive =
    sessionStorage.getItem(DEMO_SESSION_KEY) === "1";

  if (demoSessionActive) {
    return sessionStorage.getItem(DEMO_TOKEN_KEY);
  }

  return (
    localStorage.getItem(TOKEN_KEY) ??
    sessionStorage.getItem(TOKEN_KEY)
  );
}

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
  const token = getActiveTenantToken();

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
      const sharedSessionActive =
        localStorage.getItem(SHARED_MODE_KEY) === "1" &&
        Boolean(sessionStorage.getItem(SHARED_SESSION_TOKEN_KEY));
      const demoSessionActive =
        sessionStorage.getItem(DEMO_SESSION_KEY) === "1";

      if (sharedSessionActive) {
        sessionStorage.removeItem(SHARED_SESSION_TOKEN_KEY);
        window.location.replace("/shared-pos?reason=expired");
        return Promise.reject(error);
      }

      if (demoSessionActive) {
        sessionStorage.removeItem(DEMO_TOKEN_KEY);
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        window.location.replace("/demo?reason=expired");
        return Promise.reject(error);
      }

      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.replace("/login");
    }

    if (
      status === 403 &&
      error?.response?.data?.code === "TENANT_SUSPENDED"
    ) {
      const demoSessionActive =
        sessionStorage.getItem(DEMO_SESSION_KEY) === "1";

      if (demoSessionActive) {
        sessionStorage.removeItem(DEMO_TOKEN_KEY);
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        window.location.replace("/demo");
        return Promise.reject(error);
      }

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