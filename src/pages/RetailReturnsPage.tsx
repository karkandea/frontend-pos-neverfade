import { useMemo, useState, useEffect } from "react";

import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import type { RetailCatalog } from "../types/retail";

type SaleItem = {
  id: string;
  transactionItemId?: string;
  nama: string;
  hargaJual: number;
  productVariantId: string | null;
  variantSku: string;
  variantLabel: string;
  qty: number;
  quantity: number;
  productType: "goods" | "service";
  tracksStock: boolean;
  subtotal: number;
};

type Sale = {
  id: string;
  noTrx: string;
  tanggal: string;
  customerNama: string;
  items: SaleItem[];
  subtotal: number;
  total: number;
  status: "pending_payment" | "paid" | "failed";
  metodePembayaran: string;
};

type ReturnItem = {
  id: string;
  transactionItemId: string;
  productId: string;
  productName: string;
  originalVariantId: string | null;
  originalVariantSku: string;
  originalVariantLabel: string;
  quantity: number;
  originalUnitPrice: number;
  refundAmount: number;
  restock: boolean;
  replacementVariantId: string | null;
  replacementVariantSku: string;
  replacementVariantLabel: string;
};

type ReturnRecord = {
  id: string;
  returnNumber: string;
  transactionId: string;
  transactionNumber: string;
  type: "return" | "exchange";
  reason: string;
  notes: string;
  refundAmount: number;
  createdByName: string;
  createdAt: string;
  items: ReturnItem[];
};

type LineDraft = {
  selected: boolean;
  quantity: number;
  restock: boolean;
  replacementVariantId: string;
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTanggal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function errorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) return "Terjadi kesalahan.";
  const candidate = error as {
    message?: string;
    response?: { data?: { message?: string; title?: string } };
  };
  return candidate.response?.data?.message ??
    candidate.response?.data?.title ??
    candidate.message ??
    "Terjadi kesalahan.";
}

function newSubmissionKey() {
  return crypto.randomUUID();
}

export default function RetailReturnsPage() {
  const [transactions, setTransactions] = useState<Sale[]>([]);
  const [catalog, setCatalog] = useState<RetailCatalog>({ priceLevels: [], products: [] });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [selected, setSelected] = useState<Sale | null>(null);
  const [history, setHistory] = useState<ReturnRecord[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [type, setType] = useState<"return" | "exchange">("return");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submissionKey, setSubmissionKey] = useState(newSubmissionKey);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lastResult, setLastResult] = useState<ReturnRecord | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError("");
      try {
        const query = search.trim();
        const [transactionResponse, catalogResponse] = await Promise.all([
          api.get<Sale[]>("/api/transactions", {
            params: query ? { search: query } : undefined,
            signal: controller.signal,
          }),
          api.get<RetailCatalog>("/api/retail/catalog", { signal: controller.signal }),
        ]);
        setTransactions(transactionResponse.data);
        setCatalog(catalogResponse.data);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, reloadKey]);

  const returnedByItem = useMemo(() => {
    const result = new Map<string, number>();
    for (const record of history) {
      for (const item of record.items) {
        result.set(
          item.transactionItemId,
          (result.get(item.transactionItemId) ?? 0) + item.quantity
        );
      }
    }
    return result;
  }, [history]);

  const paidTransactions = useMemo(
    () => transactions.filter((entry) => entry.status === "paid"),
    [transactions]
  );

  function soldQuantity(item: SaleItem) {
    const value = Number(item.quantity || item.qty || 0);
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }

  function remainingQuantity(item: SaleItem) {
    if (!item.transactionItemId) return 0;
    return Math.max(0, soldQuantity(item) - (returnedByItem.get(item.transactionItemId) ?? 0));
  }

  function replacementVariants(item: SaleItem) {
    const product = catalog.products.find((entry) => entry.id === item.id);
    return (product?.variants ?? []).filter(
      (variant) => variant.active && variant.id !== item.productVariantId
    );
  }

  async function chooseTransaction(transaction: Sale) {
    setSelected(transaction);
    setLastResult(null);
    setSubmitError("");
    setReason("");
    setNotes("");
    setType("return");
    setSubmissionKey(newSubmissionKey());
    setDrafts(
      Object.fromEntries(
        transaction.items
          .filter((item) => item.transactionItemId)
          .map((item) => [
            item.transactionItemId!,
            { selected: false, quantity: 1, restock: true, replacementVariantId: "" },
          ])
      )
    );
    setContextLoading(true);
    setContextError("");
    try {
      const response = await api.get<ReturnRecord[]>("/api/retail/returns", {
        params: { transactionId: transaction.id },
      });
      setHistory(response.data);
    } catch (error) {
      setHistory([]);
      setContextError(errorMessage(error));
    } finally {
      setContextLoading(false);
    }
  }

  async function refreshSelectedContext(transactionId: string) {
    const [historyResponse, catalogResponse] = await Promise.all([
      api.get<ReturnRecord[]>("/api/retail/returns", { params: { transactionId } }),
      api.get<RetailCatalog>("/api/retail/catalog"),
    ]);
    setHistory(historyResponse.data);
    setCatalog(catalogResponse.data);
  }

  function updateDraft(itemId: string, patch: Partial<LineDraft>) {
    setDrafts((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...patch },
    }));
  }

  async function submit() {
    if (!selected || submitting) return;
    const items = selected.items
      .filter((item) => item.transactionItemId && drafts[item.transactionItemId]?.selected)
      .map((item) => {
        const itemId = item.transactionItemId!;
        const draft = drafts[itemId];
        return {
          source: item,
          transactionItemId: itemId,
          quantity: Math.trunc(Number(draft.quantity)),
          restock: type === "exchange" ? true : draft.restock,
          replacementVariantId:
            type === "exchange" ? draft.replacementVariantId || null : null,
        };
      });

    setSubmitError("");
    if (!reason.trim()) {
      setSubmitError("Alasan retur/tukar wajib diisi.");
      return;
    }
    if (items.length === 0) {
      setSubmitError("Pilih minimal satu item.");
      return;
    }
    for (const item of items) {
      const remaining = remainingQuantity(item.source);
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > remaining) {
        setSubmitError(`Quantity ${item.source.nama} tidak valid.`);
        return;
      }
      if (type === "exchange" && !item.replacementVariantId) {
        setSubmitError(`Pilih varian pengganti untuk ${item.source.nama}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await api.post<ReturnRecord>("/api/retail/returns", {
        idempotencyKey: submissionKey,
        transactionId: selected.id,
        type,
        reason: reason.trim(),
        notes: notes.trim(),
        items: items.map(({ transactionItemId, quantity, restock, replacementVariantId }) => ({
          transactionItemId,
          quantity,
          restock,
          replacementVariantId,
        })),
      });
      setLastResult(response.data);
      await refreshSelectedContext(selected.id);
      setReason("");
      setNotes("");
      setDrafts((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, value]) => [
            key,
            { ...value, selected: false, quantity: 1, replacementVariantId: "" },
          ])
        )
      );
      setSubmissionKey(newSubmissionKey());
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <section id="sec-retur-tukar" className="content-section active">
        <div className="section-header">
          <div>
            <h2 className="section-title">Retur & Tukar</h2>
            <p className="section-sub">
              Catat retur barang atau tukar size/color tanpa mengubah transaksi penjualan asli.
            </p>
          </div>
          <div className="search-bar">
            <input
              aria-label="Cari transaksi retur"
              placeholder="Cari no. transaksi / pelanggan..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <p>Memuat transaksi...</p>
          ) : loadError ? (
            <div role="alert" className="table-empty">
              <p>Data retur belum dapat dimuat. {loadError}</p>
              <button type="button" className="btn-secondary" onClick={() => setReloadKey((value) => value + 1)}>
                Coba Lagi
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No. Transaksi</th>
                    <th>Tanggal</th>
                    <th>Pelanggan</th>
                    <th>Total</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paidTransactions.length === 0 ? (
                    <tr><td colSpan={5} className="text-center">Tidak ada transaksi paid.</td></tr>
                  ) : paidTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.noTrx}</td>
                      <td>{formatTanggal(transaction.tanggal)}</td>
                      <td>{transaction.customerNama || "Umum"}</td>
                      <td>{rupiah(transaction.total)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
                          aria-label={`Pilih ${transaction.noTrx}`}
                          onClick={() => void chooseTransaction(transaction)}
                        >
                          {selected?.id === transaction.id ? "Dipilih" : "Pilih"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
            <div className="table-card" style={{ padding: 18 }}>
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h3>{selected.noTrx}</h3>
                  <p>{selected.customerNama || "Pelanggan Umum"} · {rupiah(selected.total)}</p>
                </div>
              </div>

              {contextLoading ? <p>Memuat histori retur...</p> : null}
              {contextError ? <p role="alert">Histori retur gagal dimuat. {contextError}</p> : null}

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="return-type">Jenis proses</label>
                  <select id="return-type" value={type} onChange={(event) => setType(event.target.value as "return" | "exchange") }>
                    <option value="return">Return / Retur</option>
                    <option value="exchange">Exchange / Tukar Varian</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="return-reason">Alasan</label>
                  <input id="return-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Contoh: ukuran tidak sesuai" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="return-notes">Catatan opsional</label>
                <textarea id="return-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pilih</th>
                      <th>Item</th>
                      <th>Terjual</th>
                      <th>Sudah retur/tukar</th>
                      <th>Sisa</th>
                      <th>Qty</th>
                      <th>{type === "return" ? "Stok" : "Varian pengganti"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item) => {
                      const itemId = item.transactionItemId ?? "";
                      const draft = drafts[itemId];
                      const remaining = remainingQuantity(item);
                      const goods = item.productType === "goods" && Boolean(itemId);
                      const variants = replacementVariants(item);
                      return (
                        <tr key={itemId || `${item.id}-${item.nama}`}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Pilih ${item.nama}`}
                              disabled={!goods || remaining <= 0}
                              checked={Boolean(draft?.selected)}
                              onChange={(event) => updateDraft(itemId, { selected: event.target.checked })}
                            />
                          </td>
                          <td>
                            <strong>{item.nama}</strong>
                            {item.variantLabel ? <div>{item.variantLabel}</div> : null}
                            {!goods ? <small>Jasa tidak dapat diretur di Phase 3E2.</small> : null}
                          </td>
                          <td>{soldQuantity(item)}</td>
                          <td>{itemId ? returnedByItem.get(itemId) ?? 0 : "-"}</td>
                          <td>{goods ? remaining : "-"}</td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, remaining)}
                              aria-label={`Quantity retur ${item.nama}`}
                              disabled={!draft?.selected}
                              value={draft?.quantity ?? 1}
                              onChange={(event) => updateDraft(itemId, { quantity: Number(event.target.value) })}
                              style={{ width: 76 }}
                            />
                          </td>
                          <td>
                            {type === "return" ? (
                              <label>
                                <input
                                  type="checkbox"
                                  aria-label={`Kembalikan ke stok ${item.nama}`}
                                  disabled={!draft?.selected || !item.tracksStock}
                                  checked={Boolean(draft?.restock)}
                                  onChange={(event) => updateDraft(itemId, { restock: event.target.checked })}
                                />{" "}
                                Kembali ke stok
                              </label>
                            ) : (
                              <select
                                aria-label={`Varian pengganti ${item.nama}`}
                                disabled={!draft?.selected || variants.length === 0}
                                value={draft?.replacementVariantId ?? ""}
                                onChange={(event) => updateDraft(itemId, { replacementVariantId: event.target.value })}
                              >
                                <option value="">Pilih varian...</option>
                                {variants.map((variant) => (
                                  <option key={variant.id} value={variant.id} disabled={variant.stok < (draft?.quantity ?? 1)}>
                                    {variant.label} · stok {variant.stok}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div role="note" style={{ marginTop: 12 }}>
                {type === "return" ? (
                  <p><strong>Catatan refund:</strong> nominal dicatat dari transaksi historis. NeverFade tidak otomatis mengirim refund ke QRIS, bank, atau provider pembayaran.</p>
                ) : (
                  <p><strong>Tukar varian:</strong> hanya untuk produk yang sama dengan jumlah sama. Jika ada selisih harga, lakukan Retur lalu buat transaksi baru.</p>
                )}
              </div>

              {submitError ? <p role="alert">{submitError}</p> : null}
              {lastResult ? (
                <div role="status">
                  <strong>{lastResult.returnNumber} berhasil dicatat.</strong>{" "}
                  {lastResult.type === "return" ? `Refund audit ${rupiah(lastResult.refundAmount)}.` : "Stok pertukaran sudah diaudit."}
                </div>
              ) : null}

              <div className="section-actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn-primary" onClick={() => void submit()} disabled={submitting || contextLoading}>
                  {submitting ? "Menyimpan..." : type === "return" ? "Simpan Retur" : "Simpan Tukar"}
                </button>
              </div>
            </div>

            <div className="table-card">
              <div style={{ padding: "16px 18px 0" }}>
                <h3>Riwayat Retur & Tukar</h3>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Jenis</th>
                      <th>Tanggal</th>
                      <th>Alasan</th>
                      <th>Item</th>
                      <th>Refund audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={6} className="text-center">Belum ada retur/tukar.</td></tr>
                    ) : history.map((record) => (
                      <tr key={record.id}>
                        <td>{record.returnNumber}</td>
                        <td>{record.type === "return" ? "Retur" : "Tukar"}</td>
                        <td>{formatTanggal(record.createdAt)}</td>
                        <td>{record.reason}</td>
                        <td>{record.items.map((item) => `${item.productName} ×${item.quantity}`).join(", ")}</td>
                        <td>{record.type === "return" ? rupiah(record.refundAmount) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
