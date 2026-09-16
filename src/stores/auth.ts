import axios from "axios";
import { create } from "zustand";
import api, { TOKEN_KEY } from "../lib/api";

const ACTIVE_QRIS_KEY = "nfpos_active_qris";
const RESTAURANT_CHECKOUT_KEY = "nfpos_restaurant_checkout";
const LAUNDRY_CHECKOUT_KEY = "nfpos_laundry_checkout";
const DEMO_SESSION_KEY = "nfpos_demo_session";

export type User = {
  id: string;
  nama: string;
  username: string;
  role: "owner" | "admin" | "kasir";
};

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  isDemo: boolean;

  setToken: (token: string | null) => void;
  login: (
    username: string,
    password: string,
    remember: boolean
  ) => Promise<void>;
  enterDemo: () => Promise<void>;
  restore: () => Promise<void>;
  logout: () => void;
};

function clearCheckoutState() {
  localStorage.removeItem(ACTIVE_QRIS_KEY);
  localStorage.removeItem(RESTAURANT_CHECKOUT_KEY);
  localStorage.removeItem(LAUNDRY_CHECKOUT_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  token:
    localStorage.getItem(TOKEN_KEY) ??
    sessionStorage.getItem(TOKEN_KEY),
  user: null,
  loading: true,
  isDemo: sessionStorage.getItem(DEMO_SESSION_KEY) === "1",

  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }

    set({ token });
  },

  login: async (username, password, remember) => {
    const { data } = await api.post("/api/auth/login", {
      username,
      password,
    });

    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    clearCheckoutState();

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, data.token);

    set({
      token: data.token,
      user: data.user,
      isDemo: false,
    });
  },

  enterDemo: async () => {
    if (import.meta.env.VITE_DEMO_MODE !== "true") {
      throw new Error("Mode demo tidak aktif pada deployment ini.");
    }

    const username = import.meta.env.VITE_DEMO_USERNAME?.trim() || "demo";
    const password = import.meta.env.VITE_DEMO_PASSWORD;

    if (!password) {
      throw new Error("Credential demo belum dikonfigurasi.");
    }

    const { data } = await api.post("/api/auth/login", {
      username,
      password,
    });

    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    clearCheckoutState();

    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(DEMO_SESSION_KEY, "1");

    set({
      token: data.token,
      user: data.user,
      isDemo: true,
      loading: false,
    });
  },

  restore: async () => {
    const token =
      localStorage.getItem(TOKEN_KEY) ??
      sessionStorage.getItem(TOKEN_KEY);

    if (!token) {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      set({
        token: null,
        user: null,
        loading: false,
        isDemo: false,
      });
      return;
    }

    try {
      const { data } = await api.get("/api/auth/me");

      set({
        token,
        user: data,
        loading: false,
        isDemo: sessionStorage.getItem(DEMO_SESSION_KEY) === "1",
      });
    } catch (error: unknown) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        clearCheckoutState();

        set({
          token: null,
          user: null,
          loading: false,
          isDemo: false,
        });

        return;
      }

      set((state) => ({
        ...state,
        loading: false,
      }));
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    clearCheckoutState();

    set({
      token: null,
      user: null,
      loading: false,
      isDemo: false,
    });
  },
}));

window.addEventListener("tenant-session-invalidated", () => {
  useAuthStore.getState().logout();
});
