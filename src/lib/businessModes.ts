import type { BusinessType, TenantCapability } from "../types/platform";

export type BusinessModeOption = {
  key: BusinessType;
  label: string;
  description: string;
};

export const businessModeOptions: BusinessModeOption[] = [
  {
    key: "general_retail",
    label: "Retail / Toko",
    description: "POS inti, inventaris, pelanggan, laporan, absensi, dan keuangan.",
  },
  {
    key: "fashion_retail",
    label: "Fashion Retail",
    description: "Retail dengan varian ukuran/warna dan harga satuan, grosir, atau reseller.",
  },
  {
    key: "food_beverage",
    label: "Restoran / Coffee Shop",
    description: "POS inti ditambah pesanan meja dan antrean dapur.",
  },
  {
    key: "laundry",
    label: "Laundry",
    description: "POS inti ditambah katalog jasa dan pesanan laundry.",
  },
  {
    key: "salon_barbershop",
    label: "Salon / Barbershop",
    description: "POS inti dengan fondasi appointment untuk fase berikutnya.",
  },
];

const commonCapabilities: TenantCapability[] = [
  "core_pos",
  "inventory",
  "customers",
  "reports",
  "attendance",
  "finance_withdrawal",
];

export const capabilityPresets: Record<BusinessType, TenantCapability[]> = {
  general_retail: commonCapabilities,
  fashion_retail: [...commonCapabilities, "product_variants", "multi_pricing"],
  food_beverage: [...commonCapabilities, "table_orders", "kitchen_queue"],
  laundry: [...commonCapabilities, "work_orders"],
  salon_barbershop: [...commonCapabilities, "appointments"],
};

export const capabilityLabels: Record<TenantCapability, string> = {
  core_pos: "Kasir & transaksi",
  inventory: "Inventaris",
  customers: "Pelanggan",
  reports: "Laporan",
  attendance: "Absensi",
  finance_withdrawal: "Saldo & penarikan",
  table_orders: "Pesanan meja",
  kitchen_queue: "Antrean dapur",
  work_orders: "Pesanan kerja / laundry",
  appointments: "Appointment",
  product_variants: "Varian produk",
  multi_pricing: "Multi harga",
};
