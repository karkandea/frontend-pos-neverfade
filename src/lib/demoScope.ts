export const DEMO_PERSONA_KEY = "nfpos_demo_persona";
export const DEMO_BUSINESS_SLUG_KEY = "nfpos_demo_business_slug";

export type DemoPersona = "cashier" | "kitchen" | "owner";

export type DemoScope = {
  persona: DemoPersona;
  businessSlug: string;
};

const restaurantAllowedPaths: Record<DemoPersona, string[]> = {
  cashier: ["/kasir", "/meja", "/transaksi"],
  kitchen: ["/dapur"],
  owner: [
    "/dashboard",
    "/produk",
    "/inventaris",
    "/pelanggan",
    "/transaksi",
    "/laporan",
    "/keuangan",
    "/karyawan",
    "/absensi",
    "/absensi/kelola",
    "/pengguna",
    "/pengaturan",
  ],
};

export function setDemoScope(scope: DemoScope) {
  sessionStorage.setItem(DEMO_PERSONA_KEY, scope.persona);
  sessionStorage.setItem(DEMO_BUSINESS_SLUG_KEY, scope.businessSlug);
}

export function clearDemoScope() {
  sessionStorage.removeItem(DEMO_PERSONA_KEY);
  sessionStorage.removeItem(DEMO_BUSINESS_SLUG_KEY);
}

export function getDemoScope(): DemoScope | null {
  const persona = sessionStorage.getItem(DEMO_PERSONA_KEY);
  const businessSlug = sessionStorage.getItem(DEMO_BUSINESS_SLUG_KEY);

  if (
    (persona !== "cashier" && persona !== "kitchen" && persona !== "owner") ||
    !businessSlug
  ) {
    return null;
  }

  return { persona, businessSlug };
}

export function getDemoPersonaLabel(persona: DemoPersona) {
  if (persona === "cashier") return "Kasir";
  if (persona === "kitchen") return "Kitchen";
  return "Owner";
}

export function getDemoDefaultPath(scope: DemoScope) {
  if (scope.businessSlug !== "restaurant") {
    return "/dashboard";
  }

  if (scope.persona === "cashier") return "/kasir";
  if (scope.persona === "kitchen") return "/dapur";
  return "/dashboard";
}

export function isDemoPathAllowed(scope: DemoScope, pathname: string) {
  if (scope.businessSlug !== "restaurant") {
    return true;
  }

  return restaurantAllowedPaths[scope.persona].some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}
