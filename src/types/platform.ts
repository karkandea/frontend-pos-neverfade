export type PlatformUser = {
  id: string;
  nama: string;
  username: string;
  role: "superadmin";
};

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
  owner: TenantOwnerSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlatformTenantRequest = {
  namaToko: string;
  owner: {
    nama: string;
    username: string;
    password: string;
  };
};

export type PlatformApiError = {
  code?: string;
  message?: string;
};
