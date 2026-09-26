import type { CashSaleCommitRequest } from "./saleQuote";

/**
 * Sprint 2 opt-in checkout persistence. The same request/key MUST be reused
 * after a timeout or reload: clearing an unconfirmed attempt may sell twice.
 * Tenant partition prevents switching logins from claiming another tenant's sale.
 */
export type PendingCashSale = CashSaleCommitRequest & {
  tenantId: string;
  cartFingerprint: string;
};

const PREFIX = "nfpos_s2_pending_cash:";

function key(tenantId: string) {
  if (!tenantId) throw new Error("Tenant wajib dipilih untuk pemulihan transaksi.");
  return `${PREFIX}${tenantId}`;
}

export function readPendingCashSale(tenantId: string): PendingCashSale | null {
  const raw = sessionStorage.getItem(key(tenantId));
  if (!raw) return null;
  try {
    const item = JSON.parse(raw) as PendingCashSale;
    if (item.tenantId === tenantId && item.outletId && item.quoteId &&
        item.quoteVersion && /^[A-Za-z0-9_-]{16,128}$/.test(item.idempotencyKey) &&
        Number.isFinite(item.amountReceived) && item.amountReceived >= 0 &&
        typeof item.cartFingerprint === "string") return item;
  } catch { /* Preserve the original bytes for manual recovery. */ }
  throw new Error("Catatan transaksi tunai tidak valid. Jangan buat transaksi baru; hubungi admin untuk rekonsiliasi.");
}

export function savePendingCashSale(attempt: PendingCashSale) {
  const previous = readPendingCashSale(attempt.tenantId);
  if (previous && (previous.quoteId !== attempt.quoteId ||
      previous.idempotencyKey !== attempt.idempotencyKey))
    throw new Error("Ada transaksi tunai yang belum dipastikan. Pulihkan attempt sebelumnya.");
  sessionStorage.setItem(key(attempt.tenantId), JSON.stringify(attempt));
}

export function clearConfirmedCashSale(attempt: PendingCashSale) {
  const previous = readPendingCashSale(attempt.tenantId);
  if (previous && previous.quoteId === attempt.quoteId &&
      previous.idempotencyKey === attempt.idempotencyKey)
    sessionStorage.removeItem(key(attempt.tenantId));
}

/** Safe only when the server returns an explicit terminal rejection after the
 * tenant lock and no transaction is committed. Never clear on timeout/5xx. */
export function isDefiniteCashRejection(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { code?: string } } })?.response;
  return (response?.status === 409 || response?.status === 422) &&
    ["QUOTE_EXPIRED", "QUOTE_STALE", "QUOTE_STALE_STOCK", "QUOTE_STALE_TAX",
      "CASH_AMOUNT_INSUFFICIENT"].includes(response?.data?.code ?? "");
}
