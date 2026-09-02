import { create } from "zustand";
import api from "../lib/api";
import type { TenantCapability, TenantContext } from "../types/platform";

type TenantContextState = {
  context: TenantContext | null;
  loading: boolean;
  error: string;
  loadedForToken: string | null;
  restore: (token: string) => Promise<void>;
  clear: () => void;
  hasCapability: (capability: TenantCapability) => boolean;
};

export const useTenantContextStore = create<TenantContextState>((set, get) => ({
  context: null,
  loading: false,
  error: "",
  loadedForToken: null,

  restore: async (token) => {
    if (get().loadedForToken === token && get().context) {
      return;
    }

    set({ loading: true, error: "" });

    try {
      const { data } = await api.get<TenantContext>("/api/tenant/context");
      set({
        context: data,
        loading: false,
        error: "",
        loadedForToken: token,
      });
    } catch {
      set({
        context: null,
        loading: false,
        error: "Konteks bisnis belum dapat dimuat. Coba lagi.",
        loadedForToken: null,
      });
    }
  },

  clear: () => {
    set({
      context: null,
      loading: false,
      error: "",
      loadedForToken: null,
    });
  },

  hasCapability: (capability) =>
    get().context?.capabilities.includes(capability) ?? false,
}));
