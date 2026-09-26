import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, RotateCcw } from "lucide-react";
import axios from "axios";
import api from "../lib/api";
import { findDemoJourney, type DemoBusinessSlug } from "../lib/demoJourney";
import { trackDemo } from "../lib/demoAnalytics";
import { getDemoSalesWhatsappUrl } from "../lib/demoSales";
import { useAuthStore } from "../stores/auth";
import DemoShell from "../components/demo/DemoShell";
import "./DemoEntryPage.css";
import "./DemoGuidedPage.css";

type Product = {
  id: string; kode: string; nama: string; hargaJual: number; stok: number;
  tracksStock: boolean; satuan: string;
};
type Customer = { id: string; nama: string };
type Table = { id: string; name: string; status: string };
type Order = {
  id: string; orderNumber: string; status: string;
  items: { id: string; kitchenStatus: string }[];
};
type WorkOrder = { id: string; orderNumber: string; status: string; total: number; paymentStatus: string };
type Transaction = { id: string; noTrx: string; total: number; status: string };
type StepId =
  | "order_opened" | "item_added" | "sent_to_kitchen" | "kitchen_preparing"
  | "kitchen_ready" | "payment_completed" | "order_closed"
  | "work_order_created" | "laundry_processing" | "laundry_ready"
  | "laundry_completed" | "product_selected" | "sale_completed" | "result_viewed";
type JourneyStep = { id: StepId; title: string; hint: string; action: string };
type Progress = {
  index: number; orderId?: string; orderNumber?: string; itemId?: string;
  transactionId?: string; productId?: string; customerId?: string;
  stockBefore?: number; stockAfter?: number; total?: number; transactionNo?: string;
};

const fnbSteps: JourneyStep[] = [
  { id: "order_opened", title: "Buka pesanan meja", hint: "Pilih meja yang kosong untuk pelanggan baru.", action: "Buka Pesanan" },
  { id: "item_added", title: "Masukkan pesanan", hint: "Pilih satu menu, lalu catat ke pesanan meja.", action: "Tambahkan Menu" },
  { id: "sent_to_kitchen", title: "Kirim ke dapur", hint: "Lihat bagaimana pesanan berpindah dari kasir ke antrean dapur.", action: "Kirim ke Dapur" },
  { id: "kitchen_preparing", title: "Mulai menyiapkan", hint: "Ubah status pesanan dari antrean menjadi sedang dibuat.", action: "Mulai Siapkan" },
  { id: "kitchen_ready", title: "Tandai siap", hint: "Pesanan yang selesai disiapkan siap diserahkan ke pelanggan.", action: "Tandai Siap" },
  { id: "payment_completed", title: "Terima pembayaran", hint: "Catat pembayaran tunai dengan nilai transaksi asli dari produk.", action: "Bayar Tunai" },
  { id: "order_closed", title: "Tutup pesanan meja", hint: "Tautkan transaksi lunas ke pesanan sehingga meja bisa digunakan lagi.", action: "Tutup Pesanan" },
  { id: "result_viewed", title: "Lihat hasilnya", hint: "Periksa transaksi dan status pesanan di backend demo.", action: "Lihat Hasil Transaksi" },
];

const laundrySteps: JourneyStep[] = [
  { id: "work_order_created", title: "Terima order laundry", hint: "Catat pelanggan, layanan kiloan, dan estimasi selesai.", action: "Terima Cucian" },
  { id: "laundry_processing", title: "Mulai proses cucian", hint: "Ubah status order menjadi sedang dikerjakan.", action: "Mulai Kerjakan" },
  { id: "laundry_ready", title: "Tandai siap diambil", hint: "Pelanggan sudah bisa mengambil cucian.", action: "Tandai Siap" },
  { id: "payment_completed", title: "Terima pembayaran", hint: "Catat pembayaran tunai yang sesuai total dan pelanggan order.", action: "Bayar Tunai" },
  { id: "laundry_completed", title: "Selesaikan order", hint: "Pembayaran dan status pesanan terhubung.", action: "Selesaikan Order" },
  { id: "result_viewed", title: "Lihat hasilnya", hint: "Verifikasi order, pembayaran, dan transaksi tersimpan.", action: "Lihat Hasil Order" },
];

const saleSteps: JourneyStep[] = [
  { id: "product_selected", title: "Pilih produk atau layanan", hint: "Pilih satu item dari katalog demo sesuai usahamu.", action: "Pilih Item" },
  { id: "sale_completed", title: "Catat transaksi", hint: "Selesaikan pembayaran tunai memakai mesin transaksi asli.", action: "Bayar Tunai" },
  { id: "result_viewed", title: "Periksa hasilnya", hint: "Lihat transaksi tercatat dan perubahan stok bila berupa barang.", action: "Lihat Hasil Penjualan" },
];

const startingProductCodes: Record<DemoBusinessSlug, string> = {
  restaurant: "FNB002", retail: "GEN001", fashion: "RTL003", laundry: "LDR001", salon: "SAL001",
};

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(value);

function getErrorMessage(cause: unknown): string {
  if (axios.isAxiosError(cause)) {
    const response = cause.response?.data as { message?: string; code?: string } | undefined;
    return response?.message ?? (cause.response?.status === 401
      ? "Sesi demo berakhir. Kembali pilih bisnis untuk memulai lagi."
      : "Aksi belum berhasil. Coba lagi atau mulai ulang skenario.");
  }
  return cause instanceof Error ? cause.message : "Aksi belum berhasil. Coba lagi.";
}

function guideStorageKey(slug: string): string {
  return `nfpos_demo_guided_${slug}`;
}

function restoreProgress(slug: string): Progress {
  try {
    const data = sessionStorage.getItem(guideStorageKey(slug));
    if (data) {
      const parsed = JSON.parse(data) as Progress;
      if (Number.isInteger(parsed.index) && parsed.index >= 0 && parsed.index <= 8) return parsed;
    }
  } catch { /* stale session: restart safely */ }
  return { index: 0 };
}

function toSalePayload(product: Product, quantity: number, customerId?: string) {
  const subtotal = Math.round(product.hargaJual * quantity * 100) / 100;
  return {
    customerId: customerId ?? null,
    items: [{
      id: product.id, nama: product.nama, hargaJual: product.hargaJual,
      qty: product.tracksStock ? quantity : 1,
      quantity, subtotal,
    }],
    subtotal, disc: 0, tax: 0, discAmt: 0, taxAmt: 0, total: subtotal,
    metodePembayaran: "tunai", dibayar: subtotal, kembalian: 0,
  };
}

export default function DemoGuidedPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const journey = findDemoJourney(slug);
  const whatsappUrl = journey ? getDemoSalesWhatsappUrl(journey.slug) : null;
  const demoActive = useAuthStore((x) => x.isDemo);
  const authLoading = useAuthStore((x) => x.loading);
  const enterDemo = useAuthStore((x) => x.enterDemo);
  const [sessionError, setSessionError] = useState("");
  const [progress, setProgress] = useState<Progress>(() => restoreProgress(slug));
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Transaction | null>(null);
  const [resultOrder, setResultOrder] = useState<Order | WorkOrder | null>(null);

  const steps = slug === "restaurant" ? fnbSteps : slug === "laundry" ? laundrySteps : saleSteps;
  const step = steps[progress.index];
  const complete = progress.index >= steps.length;
  const selectedProduct = products.find((x) => x.id === (progress.productId ?? selectedProductId));
  const quantity = slug === "laundry" ? 2.5 : 1;

  useEffect(() => {
    if (!journey || demoActive || authLoading) return;
    let cancelled = false;
    // Direct links and expired sessions should initialize without another click.
    void enterDemo(journey.businessType)
      .then(() => {
        if (!cancelled) trackDemo("demo_started", journey.slug, "guided");
      })
      .catch((cause: unknown) => {
        if (!cancelled) setSessionError(getErrorMessage(cause));
      });
    return () => { cancelled = true; };
  }, [journey, demoActive, authLoading, enterDemo]);

  useEffect(() => {
    if (!journey || !demoActive) return;
    let cancelled = false;
    async function load() {
      try {
        const [productsResponse, tablesResponse, customersResponse] = await Promise.all([
          api.get<Product[]>("/api/products"),
          slug === "restaurant" ? api.get<Table[]>("/api/restaurant/tables") : Promise.resolve({ data: [] as Table[] }),
          slug === "laundry" ? api.get<Customer[]>("/api/customers") : Promise.resolve({ data: [] as Customer[] }),
        ]);
        if (cancelled) return;
        const nextProducts = productsResponse.data;
        setProducts(nextProducts);
        setTables(tablesResponse.data);
        setCustomers(customersResponse.data);
        setSelectedProductId(
          nextProducts.find((x) => x.kode === startingProductCodes[slug as DemoBusinessSlug])?.id ?? nextProducts[0]?.id ?? "",
        );
        setSelectedTableId(tablesResponse.data.find((x) => x.status === "available")?.id ?? "");
        setSelectedCustomerId(customersResponse.data[0]?.id ?? "");
      } catch (cause) {
        if (!cancelled) setError(getErrorMessage(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [demoActive, journey, slug]);

  useEffect(() => {
    if (journey) sessionStorage.setItem(guideStorageKey(journey.slug), JSON.stringify(progress));
  }, [journey, progress]);

  const availableProducts = useMemo(() => {
    if (slug === "fashion") return products.filter((x) => !["RTL001", "RTL002"].includes(x.kode));
    if (slug === "restaurant") return products.filter((x) => x.kode.startsWith("FNB"));
    if (slug === "laundry") return products.filter((x) => x.kode === "LDR001");
    return products;
  }, [products, slug]);

  async function runStep() {
    if (!journey || !step || busy) return;
    setBusy(true);
    setError("");
    try {
      const next: Progress = { ...progress };
      const product = products.find((x) => x.id === (progress.productId ?? selectedProductId));
      if (!product && step.id !== "result_viewed") throw new Error("Produk demo belum tersedia.");

      if (slug === "restaurant") {
        if (step.id === "order_opened") {
          if (!selectedTableId) throw new Error("Belum ada meja kosong. Pilih meja lain atau tunggu reset demo.");
          const { data } = await api.post<Order>("/api/restaurant/orders", { tableId: selectedTableId });
          next.orderId = data.id; next.orderNumber = data.orderNumber;
        } else if (step.id === "item_added") {
          const { data } = await api.post<Order>(`/api/restaurant/orders/${next.orderId}/items`, { productId: product!.id, qty: 1 });
          const added = data.items.find((x) => x.kitchenStatus === "draft");
          if (!added) throw new Error("Item pesanan belum tersimpan.");
          next.itemId = added.id; next.productId = product!.id;
        } else if (step.id === "sent_to_kitchen") {
          await api.post(`/api/restaurant/orders/${next.orderId}/send-to-kitchen`);
        } else if (step.id === "kitchen_preparing" || step.id === "kitchen_ready") {
          await api.post(`/api/restaurant/kitchen/items/${next.itemId}/status`, {
            status: step.id === "kitchen_preparing" ? "preparing" : "ready",
          });
        } else if (step.id === "payment_completed") {
          if (!next.transactionId) {
            const { data } = await api.post<Transaction>("/api/transactions", toSalePayload(product!, 1));
            next.transactionId = data.id; next.total = data.total; next.transactionNo = data.noTrx;
          }
        } else if (step.id === "order_closed") {
          await api.post(`/api/restaurant/orders/${next.orderId}/close`, { transactionId: next.transactionId });
        } else if (step.id === "result_viewed") {
          const [transactionResponse, orderResponse] = await Promise.all([
            api.get<Transaction>(`/api/transactions/${next.transactionId}`),
            api.get<Order>(`/api/restaurant/orders/${next.orderId}`),
          ]);
          if (transactionResponse.data.status !== "paid" || orderResponse.data.status !== "closed")
            throw new Error("Transaksi/pesanan belum selesai. Coba periksa lagi.");
          setResult(transactionResponse.data); setResultOrder(orderResponse.data);
        }
      } else if (slug === "laundry") {
        if (step.id === "work_order_created") {
          if (!selectedCustomerId) throw new Error("Pelanggan demo tidak ditemukan.");
          const { data } = await api.post<WorkOrder>("/api/laundry/work-orders", {
            customerId: selectedCustomerId,
            items: [{ productId: product!.id, quantity: 2.5 }],
            promisedAt: new Date(Date.now() + 2 * 86400000).toISOString(),
            notes: "Contoh order dari demo terpandu NeverFade",
          });
          next.orderId = data.id; next.orderNumber = data.orderNumber;
          next.customerId = selectedCustomerId; next.productId = product!.id;
          next.total = data.total;
        } else if (step.id === "laundry_processing" || step.id === "laundry_ready" || step.id === "laundry_completed") {
          await api.post(`/api/laundry/work-orders/${next.orderId}/status`, {
            status: step.id === "laundry_processing" ? "in_progress" : step.id === "laundry_ready" ? "ready" : "completed",
          });
        } else if (step.id === "payment_completed") {
          if (!next.transactionId) {
            const { data } = await api.post<Transaction>("/api/transactions", toSalePayload(product!, 2.5, next.customerId));
            next.transactionId = data.id; next.total = data.total; next.transactionNo = data.noTrx;
            // Persist immediately so retry will link the existing paid transaction.
            setProgress(next);
          }
          await api.post(`/api/laundry/work-orders/${next.orderId}/complete-payment`, { transactionId: next.transactionId });
        } else if (step.id === "result_viewed") {
          const [transactionResponse, orderResponse] = await Promise.all([
            api.get<Transaction>(`/api/transactions/${next.transactionId}`),
            api.get<WorkOrder>(`/api/laundry/work-orders/${next.orderId}`),
          ]);
          if (transactionResponse.data.status !== "paid" || orderResponse.data.status !== "completed" || orderResponse.data.paymentStatus !== "paid")
            throw new Error("Order atau pembayaran belum tercatat selesai.");
          setResult(transactionResponse.data); setResultOrder(orderResponse.data);
        }
      } else {
        if (step.id === "product_selected") {
          next.productId = product!.id; next.stockBefore = product!.stok;
        } else if (step.id === "sale_completed") {
          if (!next.transactionId) {
            const { data } = await api.post<Transaction>("/api/transactions", toSalePayload(product!, 1));
            next.transactionId = data.id; next.total = data.total; next.transactionNo = data.noTrx;
          }
        } else if (step.id === "result_viewed") {
          const [transactionResponse, productResponse] = await Promise.all([
            api.get<Transaction>(`/api/transactions/${next.transactionId}`),
            api.get<Product>(`/api/products/${next.productId}`),
          ]);
          if (transactionResponse.data.status !== "paid") throw new Error("Pembayaran belum tercatat lunas.");
          if (product!.tracksStock && productResponse.data.stok !== (next.stockBefore ?? 0) - 1)
            throw new Error("Stok belum sesuai. Data demo mungkin di-reset; silakan mulai ulang.");
          next.stockAfter = productResponse.data.stok;
          setResult(transactionResponse.data);
        }
      }

      next.index = progress.index + 1;
      setProgress(next);
      trackDemo("scenario_step_completed", journey.slug, "guided", step.id);
      if (next.index >= steps.length) trackDemo("scenario_completed", journey.slug, "guided");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    if (!journey) return;
    sessionStorage.removeItem(guideStorageKey(journey.slug));
    setProgress({ index: 0 }); setResult(null); setResultOrder(null); setError("");
    setSelectedTableId(tables.find((x) => x.status === "available")?.id ?? "");
  }

  if (!journey) return <DemoShell><p>Jenis bisnis tidak ditemukan. <Link to="/demo">Pilih bisnis lain</Link>.</p></DemoShell>;

  return (
    <DemoShell>
      <div className="demo-guided-page">
        <div className="demo-guided-top">
          <button type="button" className="demo-business-back" onClick={() => navigate(`/demo/business/${journey.slug}`)}>
            <ArrowLeft aria-hidden="true" /> Pilih mode lain
          </button>
          <button type="button" className="demo-guided-reset" onClick={restart}>
            <RotateCcw aria-hidden="true" /> Mulai ulang
          </button>
        </div>

        <header className="demo-guided-header">
          <span className="demo-overline">DEMO TERPANDU · {journey.title.toUpperCase()}</span>
          <h1>{journey.guidedTitle}</h1>
          <p>{journey.guidedDescription}</p>
          <span className="demo-guided-privacy"><Check size={13} aria-hidden="true" /> Tanpa registrasi · Transaksi simulasi</span>
        </header>

        {!demoActive ? (
          <div className="demo-guided-missing" role="status">
            {sessionError ? (
              <>
                <p>{sessionError}</p>
                <button type="button" onClick={() => {
                  setSessionError("");
                  void enterDemo(journey.businessType).then(() => {
                    trackDemo("demo_started", journey.slug, "guided");
                  }).catch((cause: unknown) => setSessionError(getErrorMessage(cause)));
                }}>
                  Coba Lagi
                </button>
              </>
            ) : <p>Menyiapkan demo otomatis…</p>}
          </div>
        ) : (
          <div className="demo-guided-layout">
            <section className="demo-guided-workspace" aria-label="Skenario bisnis">
              <div className="demo-guided-progress-row">
                <strong>{complete ? "Skenario selesai" : `Langkah ${progress.index + 1} dari ${steps.length}`}</strong>
                <span>{Math.round(progress.index / steps.length * 100)}%</span>
              </div>
              <div className="demo-guided-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={progress.index} aria-label="Kemajuan demo">
                <span style={{ width: `${progress.index / steps.length * 100}%` }} />
              </div>

              {complete ? (
                <div className="demo-guided-finish" role="status">
                  <CheckCircle2 aria-hidden="true" />
                  <h2>Berhasil! Ini hasil kerja sistemnya.</h2>
                  <p>{journey.guidedOutcome}</p>
                  <div className="demo-guided-receipt">
                    <span>Transaksi <strong>{result?.noTrx ?? progress.transactionNo}</strong></span>
                    <span>Total <strong>{rupiah(result?.total ?? progress.total ?? 0)}</strong></span>
                    {resultOrder ? <span>Order <strong>{progress.orderNumber}</strong></span> : null}
                    {typeof progress.stockBefore === "number" && selectedProduct?.tracksStock ? (
                      <span>Stok barang <strong>{progress.stockBefore} → {progress.stockAfter}</strong></span>
                    ) : null}
                  </div>
                  <Link className="demo-guided-report-link" to={journey.slug === "laundry" ? "/laundry" : "/laporan"}>
                    {journey.slug === "laundry" ? "Lihat status di Pesanan Laundry" : "Lihat hasil di Laporan"}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                  <div className="demo-guided-conversion">
                    <strong>Cocok untuk operasional bisnismu?</strong>
                    <p>Bandingkan paket, lanjut eksplorasi, atau tanya tim NeverFade sebelum memutuskan.</p>
                    <div className="demo-guided-conversion-actions">
                      {whatsappUrl ? (
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                          onClick={() => trackDemo("conversion_cta_clicked", journey.slug, "guided", "contact")}>
                          Konsultasi via WhatsApp <ArrowRight size={15} aria-hidden="true" />
                        </a>
                      ) : null}
                      <Link to="/demo/pricing" onClick={() => trackDemo("conversion_cta_clicked", journey.slug, "guided", "pricing")}>
                        Lihat Harga <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                      <Link to={`/demo/business/${journey.slug}`}>
                        Lanjut Eksplorasi
                      </Link>
                    </div>
                    <Link className="demo-guided-login-link" to="/login"
                      onClick={() => trackDemo("conversion_cta_clicked", journey.slug, "guided", "merchant_login")}>
                      Sudah punya akun? Masuk Merchant
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="demo-guided-current">
                  <span className="demo-guided-step-eyebrow">COBA SENDIRI</span>
                  <h2>{step.title}</h2>
                  <p>{step.hint}</p>
                  {loading ? <p>Menyiapkan data simulasi…</p> : null}

                  {step.id === "order_opened" ? (
                    <label className="demo-guided-field">Pilih meja kosong
                      <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)}>
                        {tables.filter((x) => x.status === "available").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </label>
                  ) : null}
                  {step.id === "product_selected" || step.id === "item_added" || step.id === "work_order_created" ? (
                    <label className="demo-guided-field">{slug === "laundry" ? "Layanan simulasi" : "Pilih item simulasi"}
                      <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                        {availableProducts.map((x) => <option key={x.id} value={x.id}>{x.nama} · {rupiah(x.hargaJual)}{slug === "laundry" ? "/kg" : ""}</option>)}
                      </select>
                    </label>
                  ) : null}
                  {step.id === "work_order_created" ? (
                    <label className="demo-guided-field">Pelanggan simulasi
                      <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                        {customers.map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <div className="demo-guided-preview">
                    {progress.orderNumber ? <span>Order <strong>{progress.orderNumber}</strong></span> : null}
                    {selectedProduct ? <span>{selectedProduct.nama} <strong>{rupiah(selectedProduct.hargaJual * quantity)}</strong></span> : null}
                    {progress.transactionNo ? <span>Transaksi <strong>{progress.transactionNo}</strong></span> : null}
                    {selectedProduct?.tracksStock && typeof progress.stockBefore === "number" ? <span>Stok awal <strong>{progress.stockBefore}</strong></span> : null}
                  </div>
                  {error ? <div className="demo-guided-error" role="alert">{error}</div> : null}
                  <button className="demo-guided-action" type="button" disabled={loading || busy || !selectedProduct || (step.id === "order_opened" && !selectedTableId)} onClick={() => void runStep()}>
                    {busy ? "Memproses…" : step.action} <ArrowRight size={17} aria-hidden="true" />
                  </button>
                  <p className="demo-guided-note">Setiap aksi di atas benar-benar tersimpan dalam database demo. Data akan di-reset otomatis.</p>
                </div>
              )}
            </section>
            <aside className="demo-guided-step-list" aria-label="Tahapan skenario">
              <span className="demo-overline">ALUR SKENARIO</span>
              {steps.map((x, i) => (
                <div className={`demo-guided-step ${i < progress.index ? "is-done" : i === progress.index ? "is-current" : ""}`} key={x.id}>
                  {i < progress.index ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
                  <span>{x.title}</span>
                </div>
              ))}
              <div className="demo-guided-free-link">
                Mau coba fitur lain? <Link to={`/demo/business/${journey.slug}`}>Eksplorasi Bebas</Link>
              </div>
            </aside>
          </div>
        )}
        {error && !demoActive ? <div className="demo-guided-error" role="alert">{error}</div> : null}
      </div>
    </DemoShell>
  );
}
