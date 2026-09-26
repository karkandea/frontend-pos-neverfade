import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { getActiveOutletId, OUTLET_CHANGED_EVENT } from "../lib/outlet";

type AttentionItem = {
  paymentId: string;
  transactionId: string;
  providerReferenceId: string;
  providerPaymentRequestId?: string | null;
  status: "creating" | "pending";
  reason: "provider_request_unknown" | "expiry_requires_provider_verification" | "awaiting_provider_confirmation";
  amount: number;
  currency: string;
  createdAt: string;
  expiresAt?: string | null;
};
type AttentionResponse = {
  outletId: string;
  total: number;
  hasMore: boolean;
  items: AttentionItem[];
};

const explanations: Record<AttentionItem["reason"], string> = {
  provider_request_unknown: "Provider mungkin sudah menerima permintaan, tetapi nomor request belum tersimpan. Jangan buat QRIS baru.",
  expiry_requires_provider_verification: "Waktu tampilan QRIS sudah lewat. Status final tetap harus dikonfirmasi provider.",
  awaiting_provider_confirmation: "Menunggu konfirmasi pembayaran dari provider.",
};
const amount = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(value);

export default function PaymentAttentionPage() {
  const [data, setData] = useState<AttentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [outlet, setOutlet] = useState(() => getActiveOutletId());
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const onOutletChange = () => {
      setLoading(true);
      setData(null);
      setOutlet(getActiveOutletId());
      setReloadNonce((value) => value + 1);
    };
    window.addEventListener(OUTLET_CHANGED_EVENT, onOutletChange);
    return () => window.removeEventListener(OUTLET_CHANGED_EVENT, onOutletChange);
  }, []);
  useEffect(() => {
    let active = true;
    void api.get<AttentionResponse>("/api/payments/attention", {
      headers: outlet ? { "X-Outlet-Id": outlet } : undefined,
    }).then((response) => {
      if (active) { setData(response.data); setError(""); }
    }).catch((cause: unknown) => {
      if (active) {
        const message = (cause as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
        setError(message || "Status pembayaran belum dapat dibaca. Periksa koneksi dan hak akses outlet.");
        setData(null);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [outlet, reloadNonce]);

  function refresh() {
    setLoading(true);
    setOutlet(getActiveOutletId());
    setReloadNonce((value) => value + 1);
  }

  return (
    <AppShell>
      <section className="content-section active" aria-label="Pembayaran perlu perhatian">
        <div className="section-header">
          <div>
            <h1 className="section-title">Status Pembayaran</h1>
            <p className="section-sub">Antrian QRIS belum final di outlet terpilih. Hanya owner dan admin.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>
            {loading ? "Memeriksa..." : "Periksa Lagi"}
          </button>
        </div>
        <div className="table-card" style={{ padding: 18, marginBottom: 16 }} role="note">
          Data ini bukan bukti pembayaran atau izin membuat tagihan baru. Status expired di layar tidak sama dengan pembatalan provider. Jika tidak pasti, cocokkan referensi dengan penyedia pembayaran sebelum mengambil tindakan.
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {loading && !data ? <p>Memuat antrean pembayaran...</p> : null}
        {data && !loading ? (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>{data.total} pembayaran belum final</h2>
            {data.total === 0 ? <p>Tidak ada pembayaran QRIS yang menunggu kepastian di outlet ini.</p> : null}
            {data.hasMore ? <p role="note">Menampilkan 100 data terlama. Gunakan rekonsiliasi admin untuk sisanya.</p> : null}
            <div style={{ display: "grid", gap: 12 }}>
              {data.items.map((item) => (
                <article className="table-card" key={item.paymentId} style={{ padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <strong>{amount(item.amount)} · {item.currency}</strong>
                    <span className="status-badge">{item.status === "creating" ? "Membuat QRIS" : "Menunggu pembayaran"}</span>
                  </div>
                  <p style={{ marginTop: 10 }}>{explanations[item.reason]}</p>
                  <p style={{ overflowWrap: "anywhere" }}>Referensi: <code>{item.providerReferenceId}</code></p>
                  <p style={{ overflowWrap: "anywhere" }}>Request provider: <code>{item.providerPaymentRequestId || "Belum diketahui"}</code></p>
                  <p style={{ fontSize: 13 }}>Dibuat: {new Date(item.createdAt).toLocaleString("id-ID")}</p>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
