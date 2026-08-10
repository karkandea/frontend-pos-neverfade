import axios from "axios";
import { create } from "zustand";

import platformApi, {
  PLATFORM_TOKEN_KEY,
} from "../lib/platformApi";
import type { PlatformUser } from "../types/platform";

type PlatformAuthState = {
  token: string | null;
  user: PlatformUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => void;
};

export const usePlatformAuthStore = create<PlatformAuthState>((set) => ({
  token: localStorage.getItem(PLATFORM_TOKEN_KEY),
  user: null,
  loading: true,

  login: async (username, password) => {
    const { data } = await platformApi.post<{
      token: string;
      user: PlatformUser;
    }>("/api/platform/auth/login", {
      username,
      password,
    });

    localStorage.setItem(PLATFORM_TOKEN_KEY, data.token);
    set({ token: data.token, user: data.user });
  },

  restore: async () => {
    const token = localStorage.getItem(PLATFORM_TOKEN_KEY);

    if (!token) {
      set({ token: null, user: null, loading: false });
      return;
    }

    try {
      const { data } = await platformApi.get<PlatformUser>(
        "/api/platform/auth/me"
      );
      set({ token, user: data, loading: false });
    } catch (error: unknown) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 ||
          error.response?.status === 403)
      ) {
        localStorage.removeItem(PLATFORM_TOKEN_KEY);
        set({ token: null, user: null, loading: false });
        return;
      }

      set((state) => ({ ...state, loading: false }));
    }
  },

  logout: () => {
    localStorage.removeItem(PLATFORM_TOKEN_KEY);
    set({ token: null, user: null, loading: false });
  },
}));

window.addEventListener("platform-session-invalidated", () => {
  usePlatformAuthStore.getState().logout();
});
