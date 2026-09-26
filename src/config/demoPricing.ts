/**
 * NeverFade demo pricing — SINGLE EDIT POINT.
 *
 * This is intentionally a placeholder, NOT a live merchant offer.
 * To publish actual prices later, replace each name/description/features,
 * set monthlyPrice to its real IDR amount, and set isFinal to true ONLY after
 * commercial approval. Do not enter 0 as a stand-in for an unknown price.
 * Add/remove plan objects here to change the card count automatically.
 * The official WhatsApp number is configured separately via
 * VITE_DEMO_SALES_WHATSAPP (digits only, e.g. 628...).
 */
export type DemoPricingPlan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  billingLabel: string;
  features: string[];
  isFinal: boolean;
};

export const demoPricingPlans: DemoPricingPlan[] = [
  {
    id: "paket-01",
    name: "Paket 01",
    description: "Deskripsi singkat paket — isi nanti.",
    monthlyPrice: null,
    billingLabel: "/bulan",
    features: ["Fitur utama — isi nanti", "Fitur tambahan — isi nanti", "Batas penggunaan — isi nanti"],
    isFinal: false,
  },
  {
    id: "paket-02",
    name: "Paket 02",
    description: "Deskripsi singkat paket — isi nanti.",
    monthlyPrice: null,
    billingLabel: "/bulan",
    features: ["Fitur utama — isi nanti", "Fitur tambahan — isi nanti", "Batas penggunaan — isi nanti"],
    isFinal: false,
  },
  {
    id: "paket-03",
    name: "Paket 03",
    description: "Deskripsi singkat paket — isi nanti.",
    monthlyPrice: null,
    billingLabel: "/bulan",
    features: ["Fitur utama — isi nanti", "Fitur tambahan — isi nanti", "Batas penggunaan — isi nanti"],
    isFinal: false,
  },
];

export const demoPricingIsApproved =
  demoPricingPlans.length > 0 &&
  demoPricingPlans.every(
    (plan) => plan.isFinal && Number.isFinite(plan.monthlyPrice) &&
      plan.monthlyPrice !== null && plan.monthlyPrice > 0,
  );
