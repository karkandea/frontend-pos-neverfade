import { normalizeWhatsAppPhone } from "./laundryWhatsapp";

type ReceiptItem = { nama: string; qty: number; hargaJual: number; subtotal: number };
type ReceiptForWhatsApp = {
  noTrx: string;
  transactionDate: string;
  kasir?: string;
  items: ReceiptItem[];
  subtotal: number;
  discAmt: number;
  taxAmt: number;
  total: number;
  metodePembayaran: string;
  dibayar: number;
  kembalian: number;
};

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(value);

/** Prepare a WhatsApp draft only; this does not send or confirm delivery. */
export function buildReceiptWhatsAppUrl(
  receipt: ReceiptForWhatsApp,
  phoneInput: string,
  header: string,
  footer: string,
): string {
  const phone = normalizeWhatsAppPhone(phoneInput);
  if (!phone) return "";

  const lines = [
    header.trim() || "Struk Belanja",
    `No. ${receipt.noTrx}`,
    new Date(receipt.transactionDate).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
    ...(receipt.kasir ? [`Kasir: ${receipt.kasir}`] : []),
    "───────────────",
    ...receipt.items.map((item) => `${item.nama}\n${item.qty} × ${rupiah(item.hargaJual)} = ${rupiah(item.subtotal)}`),
    "───────────────",
    `Subtotal: ${rupiah(receipt.subtotal)}`,
    `Diskon: ${rupiah(receipt.discAmt)}`,
    `Pajak: ${rupiah(receipt.taxAmt)}`,
    `Total: ${rupiah(receipt.total)}`,
    `Metode: ${receipt.metodePembayaran}`,
    `Dibayar: ${rupiah(receipt.dibayar)}`,
    `Kembalian: ${rupiah(receipt.kembalian)}`,
    footer.trim(),
  ].filter(Boolean);
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}
