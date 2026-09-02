export type PlatformUser = {
  id: string;
  nama: string;
  username: string;
  role: "superadmin";
};

export type BusinessType =
  | "general_retail"
  | "food_beverage"
  | "laundry"
  | "salon_barbershop";

export type TenantCapability =
  | "core_pos"
  | "inventory"
  | "customers"
  | "reports"
  | "attendance"
  | "finance_withdrawal"
  | "table_orders"
  | "kitchen_queue"
  | "work_orders"
  | "appointments";

export type TenantOwnerSummary = {
  id: string;
  nama: string;
  username: string;
  active: boolean;
};

export type PlatformTenant = {
  id: string;
  namaToko: string;
  slug: string;
  status: "active" | "suspended";
  businessType: BusinessType;
  capabilities: TenantCapability[];
  owner: TenantOwnerSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlatformTenantRequest = {
  namaToko: string;
  businessType: BusinessType;
  owner: {
    nama: string;
    username: string;
    password: string;
  };
};

export type TenantContext = {
  tenantId: string;
  namaToko: string;
  businessType: BusinessType;
  capabilities: TenantCapability[];
  role: "owner" | "admin" | "kasir";
};

export type PlatformApiError = {
  code?: string;
  message?: string;
};
