import api from "./api";

// Sprint 2 transport contract. Quote preview is NOT a sale, stock hold or payment attempt.
// Keep checkout on the existing flow until the idempotent v2 sale/tender workflow passes QA.
export type SaleQuoteLineInput = {
  productId: string;
  variantId?: string | null;
  priceLevelId?: string | null;
  quantity: number;
  note?: string | null;
};

export type CreateSaleQuoteRequest = {
  outletId: string;
  customerId?: string | null;
  discountCode?: string | null;
  discountPercent?: number;
  lines: SaleQuoteLineInput[];
};

export type SaleQuoteLine = {
  productId: string;
  variantId: string | null;
  priceLevelId: string | null;
  requestedPriceLevelId: string | null;
  productName: string;
  unit: string;
  priceLevelName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  note: string;
};

export type SaleQuote = {
  quoteId: string;
  quoteVersion: string;
  outletId: string;
  customerId: string | null;
  expiresAt: string;
  status: "quoted" | "expired" | "consumed";
  stockReserved: false;
  lines: SaleQuoteLine[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  taxRatePercent: number;
  tax: number;
  serviceCharge: number;
  total: number;
  currency: "IDR";
  warnings: string[];
};

export async function createSaleQuote(input: CreateSaleQuoteRequest): Promise<SaleQuote> {
  if (!input.outletId) throw new Error("Pilih outlet terlebih dahulu.");
  const response = await api.post<{ data: SaleQuote; meta: { correlationId: string } }>("/api/v2/sales/quotes", input, {
    headers: { "X-Outlet-Id": input.outletId },
  });
  return response.data.data;
}

export async function getSaleQuote(quoteId: string, outletId: string): Promise<SaleQuote> {
  if (!quoteId || !outletId) throw new Error("Quote dan outlet wajib dipilih.");
  const response = await api.get<{ data: SaleQuote; meta: { correlationId: string } }>(`/api/v2/sales/quotes/${encodeURIComponent(quoteId)}`, {
    headers: { "X-Outlet-Id": outletId },
  });
  return response.data.data;
}

export type CashSaleCommitRequest = {
  outletId: string;
  quoteId: string;
  quoteVersion: string;
  amountReceived: number;
  /** Must remain identical for all retries of the same checkout. */
  idempotencyKey: string;
};

export type CashSaleCommitResponse = {
  data: {
    id: string;
    noTrx: string;
    status: "paid";
    metodePembayaran: "tunai";
    total: number;
    dibayar: number;
    kembalian: number;
  };
  meta: {
    correlationId: string;
    replayed: boolean;
    quoteId: string;
    quoteVersion: string;
  };
};

export async function commitCashSale(input: CashSaleCommitRequest): Promise<CashSaleCommitResponse> {
  if (!input.outletId || !input.quoteId || !input.quoteVersion || !input.idempotencyKey) {
    throw new Error("Outlet, quote, versi, dan kunci idempotency wajib diisi.");
  }
  const { data } = await api.post<CashSaleCommitResponse>("/api/v2/sales/cash", {
    quoteId: input.quoteId,
    quoteVersion: input.quoteVersion,
    amountReceived: input.amountReceived,
  }, {
    headers: {
      "X-Outlet-Id": input.outletId,
      "Idempotency-Key": input.idempotencyKey,
    },
  });
  return data;
}
