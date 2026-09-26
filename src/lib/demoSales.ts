import type { DemoBusinessSlug } from "./demoJourney";
import { findDemoJourney } from "./demoJourney";

/** Configure only a verified official number. An empty value renders no WA CTA. */
export function getDemoSalesWhatsappUrl(slug: DemoBusinessSlug): string | null {
  const phone = import.meta.env.VITE_DEMO_SALES_WHATSAPP?.trim() ?? "";
  if (!/^62[1-9][0-9]{7,12}$/.test(phone)) return null;
  const title = findDemoJourney(slug)?.title ?? "bisnis saya";
  const message = `Halo tim NeverFade, saya sudah mencoba demo POS untuk ${title} dan ingin konsultasi untuk usaha saya.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
