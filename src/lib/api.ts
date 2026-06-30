import axios from "axios";

export const TOKEN_KEY = "nfpos_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

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
      window.location.replace("/login");
    }

    if (!error.response) {
      return Promise.reject(
        new Error("Gagal terhubung ke server. Coba lagi.")
      );
    }

    return Promise.reject(error);
  }
);

export default api;
