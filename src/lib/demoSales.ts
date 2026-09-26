import type { DemoBusinessSlug } from "./demoJourney";
import { findDemoJourney } from "./demoJourney";

/** Configure only a verified official number. An empty value renders no WA CTA. */
function whatsappUrl(message: string): string | null {
  const phone = import.meta.env.VITE_DEMO_SALES_WHATSAPP?.trim() ?? "";
  if (!/^62[1-9][0-9]{7,12}$/.test(phone)) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function getDemoSalesWhatsappUrl(slug: DemoBusinessSlug): string | null {
  const title = findDemoJourney(slug)?.title ?? "bisnis saya";
  return whatsappUrl(`Halo tim NeverFade, saya sudah mencoba demo POS untuk ${title} dan ingin konsultasi untuk usaha saya.`);
}

export function getDemoPricingWhatsappUrl(planName: string): string | null {
  return whatsappUrl(`Halo tim NeverFade, saya ingin menanyakan informasi terbaru mengenai ${planName} dan harga NeverFade POS.`);
}
