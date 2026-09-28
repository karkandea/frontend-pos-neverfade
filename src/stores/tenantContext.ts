import { create } from "zustand";
import api, { formatApiError } from "../lib/api";
import { businessModeOptions, capabilityLabels } from "../lib/businessModes";
import type { TenantCapability, TenantContext } from "../types/platform";

let restoreGeneration = 0;
let restoreInFlight: {
  token: string;
  promise: Promise<void>;
} | null = null;

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
        Object.prototype.hasOwnProperty.call(
          capabilityLabels,
          capability
        )
    );

  return (
    typeof candidate.tenantId === "string" &&
    candidate.tenantId.length > 0 &&
    typeof candidate.namaToko === "string" &&
    validBusinessType &&
    validCapabilities &&
    (candidate.effectivePermissions === undefined ||
      (Array.isArray(candidate.effectivePermissions) && candidate.effectivePermissions.every(
        (permission) => typeof permission === "string"))) &&
    (candidate.assignedOutletIds === undefined ||
      (Array.isArray(candidate.assignedOutletIds) && candidate.assignedOutletIds.every(
        (outletId) => typeof outletId === "string"))) &&
    (candidate.role === "owner" ||
      candidate.role === "admin" ||
      candidate.role === "kasir" ||
      candidate.role === "dapur" ||
      candidate.role === "laundry_operator")
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

    if (restoreInFlight?.token === token) {
      return restoreInFlight.promise;
    }

    const generation = ++restoreGeneration;
    const promise = (async () => {
      set({ loading: true, error: "" });

      try {
        const { data: response } = await api.get<unknown>("/api/v2/context");
        // Production v2 returns {data,meta}; accepting a raw context here keeps
        // compatibility with transitional/mock clients without changing server contract.
        const payload = response && typeof response === "object" && "data" in response
          ? (response as { data: unknown }).data
          : response;
        if (!isTenantContext(payload)) {
          throw new Error("Invalid tenant context response.");
        }
        const data = payload;

        if (generation !== restoreGeneration) {
          return;
        }

        set({
          context: data,
          loading: false,
          error: "",
          loadedForToken: token,
        });
      } catch (error) {
        if (generation !== restoreGeneration) {
          return;
        }

        set({
          context: null,
          loading: false,
          error: formatApiError(error, "Konteks bisnis belum dapat dimuat. Coba lagi."),
          loadedForToken: null,
        });
      }
    })();

    restoreInFlight = { token, promise };

    try {
      await promise;
    } finally {
      if (restoreInFlight?.promise === promise) {
        restoreInFlight = null;
      }
    }
  },

  clear: () => {
    restoreGeneration += 1;
    restoreInFlight = null;

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
