import { create } from "zustand";
import api, { TOKEN_KEY } from "../lib/api";

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

  setToken: (token: string | null) => void;
  login: (username: string, password: string) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  loading: true,

  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }

    set({ token });
  },

  login: async (username, password) => {
    const { data } = await api.post("/api/auth/login", {
      username,
      password,
    });

    localStorage.setItem(TOKEN_KEY, data.token);

    set({
      token: data.token,
      user: data.user,
    });
  },

  restore: async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      set({
        token: null,
        user: null,
        loading: false,
      });
      return;
    }

    try {
      const { data } = await api.get("/api/auth/me");

      set({
        token,
        user: data,
        loading: false,
      });
    } catch (error: any) {
      if (error?.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);

        set({
          token: null,
          user: null,
          loading: false,
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

    set({
      token: null,
      user: null,
      loading: false,
    });
  },
}));
