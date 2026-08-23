import axios from "axios";

export const PLATFORM_TOKEN_KEY = "nfpos_platform_token";

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || undefined;

export const platformApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

platformApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(PLATFORM_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

platformApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(PLATFORM_TOKEN_KEY);
      window.dispatchEvent(new Event("platform-session-invalidated"));

      if (window.location.pathname.startsWith("/platform")) {
        window.location.replace("/platform/login");
      }
    }

    if (!error.response) {
      return Promise.reject(
        new Error("Gagal terhubung ke server. Coba lagi.")
      );
    }

    return Promise.reject(error);
  }
);

export default platformApi;
