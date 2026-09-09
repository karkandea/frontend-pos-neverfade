import type { LaundryWorkOrder } from "../types/laundry";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export function normalizeWhatsAppPhone(
  value: string
) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("62") && digits.length >= 10) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return "62" + digits.slice(1);
  }

  if (digits.startsWith("8") && digits.length >= 9) {
    return "62" + digits;
  }

  return "";
}

export function buildLaundryWhatsAppUrl(
  order: LaundryWorkOrder,
  tenantName: string
) {
  const phone = normalizeWhatsAppPhone(order.customerPhone);
  if (!phone) return "";

  const message =
    "Halo " +
    order.customerName +
    ", pesanan laundry " +
    order.orderNumber +
    " di " +
    tenantName +
    " sudah selesai dan siap diambil. Total: " +
    rupiah(order.total) +
    ". Terima kasih.";

  return (
    "https://wa.me/" +
    phone +
    "?text=" +
    encodeURIComponent(message)
  );
}
