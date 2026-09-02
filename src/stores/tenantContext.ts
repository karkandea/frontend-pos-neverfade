import { create } from "zustand";
import api from "../lib/api";
import { businessModeOptions, capabilityLabels } from "../lib/businessModes";
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

function isTenantContext(value: unknown): value is TenantContext {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<TenantContext>;
  const validBusinessType = businessModeOptions.some(
    (option) => option.key === candidate.businessType
  );
  const validCapabilities =
    Array.isArray(candidate.capabilities) &&
    candidate.capabilities.every(
      (capability) =>
        typeof capability === "string" &&
        capability in capabilityLabels
    );

  return (
    typeof candidate.tenantId === "string" &&
    candidate.tenantId.length > 0 &&
    typeof candidate.namaToko === "string" &&
    validBusinessType &&
    validCapabilities &&
    (candidate.role === "owner" ||
      candidate.role === "admin" ||
      candidate.role === "kasir")
  );
}

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
      const { data } = await api.get<unknown>("/api/tenant/context");
      if (!isTenantContext(data)) {
        throw new Error("Invalid tenant context response.");
      }

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
