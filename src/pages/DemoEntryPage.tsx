import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  CircleHelp,
  ClipboardList,
  CookingPot,
  CreditCard,
  LayoutGrid,
  LogIn,
  PackageSearch,
  PlayCircle,
  Receipt,
  RefreshCw,
  Scissors,
  Sparkles,
  SwatchBook,
  Table2,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { BusinessType } from "../types/platform";
import { useAuthStore } from "../stores/auth";
import "./DemoEntryPage.css";

type DemoOption = {
  key: BusinessType;
  title: string;
  kicker: string;
  description: string;
  features: { label: string; icon: LucideIcon }[];
  destination: string;
  image: string;
};

const demoOptions: DemoOption[] = [
  {
    key: "food_beverage",
    kicker: "FOOD & BEVERAGE",
    title: "Cafe, restoran, dan warung",
    description: "Kelola meja, pesanan, kitchen, pembayaran, dan laporan dalam satu alur.",
    features: [
      { label: "Meja", icon: Table2 },
      { label: "Kitchen", icon: CookingPot },
      { label: "Kasir", icon: Receipt },
    ],
    destination: "/meja",
    image: "/demo-assets/cafe.webp",
  },
  {
    key: "general_retail",
    kicker: "RETAIL",
    title: "Toko dan minimarket",
    description: "Transaksi cepat dengan stok real-time, produk harian, dan laporan penjualan.",
    features: [
      { label: "Kasir", icon: Receipt },
      { label: "Stok", icon: Boxes },
      { label: "Laporan", icon: BarChart3 },
    ],
    destination: "/kasir",
    image: "/demo-assets/minimarket.webp",
  },
  {
    key: "fashion_retail",
    kicker: "FASHION",
    title: "Butik dan distro",
    description: "Kelola varian ukuran, warna, stok, serta checkout produk fashion dengan rapi.",
    features: [
      { label: "Varian", icon: SwatchBook },
      { label: "Inventory", icon: Boxes },
      { label: "Checkout", icon: CreditCard },
    ],
    destination: "/kasir",
    image: "/demo-assets/fashion.webp",
  },
  {
    key: "laundry",
    kicker: "LAUNDRY",
    title: "Laundry kiloan dan express",
    description: "Terima order, pantau proses cucian, pembayaran, dan status pickup pelanggan.",
    features: [
      { label: "Order", icon: ClipboardList },
      { label: "Status", icon: RefreshCw },
      { label: "Pembayaran", icon: Wallet },
    ],
    destination: "/laundry",
    image: "/demo-assets/laundry.webp",
  },
  {
    key: "salon_barbershop",
    kicker: "SERVICE",
    title: "Salon dan barbershop",
    description: "Kelola layanan, pelanggan, staff, dan transaksi harian dengan workflow yang simpel.",
    features: [
      { label: "Layanan", icon: Scissors },
      { label: "Customer", icon: Users },
      { label: "Staff", icon: UserCog },
    ],
    destination: "/kasir",
    image: "/demo-assets/salon.webp",
  },
];

const features: { title: string; copy: string; icon: LucideIcon }[] = [
  { title: "Kasir & Checkout", copy: "Transaksi cepat, diskon, dan pembayaran", icon: Receipt },
  { title: "Inventory", copy: "Stok dan pergerakan barang real-time", icon: Boxes },
  { title: "Reports & Analytics", copy: "Pantau penjualan dan performa bisnis", icon: BarChart3 },
  { title: "Customer", copy: "Profil, histori, dan data pelanggan", icon: Users },
  { title: "Staff & Roles", copy: "Atur akses dan aktivitas tim", icon: UserCog },
  { title: "QRIS & Payments", copy: "Beragam metode pembayaran", icon: Wallet },
  { title: "Digital Receipt", copy: "Struk yang mudah dibagikan", icon: Receipt },
  { title: "Multi-price", copy: "Harga satuan, grosir, dan variasi", icon: PackageSearch },
  { title: "Kitchen Queue", copy: "Alur pesanan kasir ke dapur", icon: CookingPot },
];

function BrandMark() {
  return (
    <span className="nf-brand-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

export default function DemoEntryPage() {
  const navigate = useNavigate();
  const enterDemo = useAuthStore((state) => state.enterDemo);
  const [loadingKey, setLoadingKey] = useState<BusinessType | null>(null);
  const [error, setError] = useState("");

  async function chooseDemo(option: DemoOption) {
    if (loadingKey) return;
    setLoadingKey(option.key);
    setError("");

    try {
      await enterDemo(option.key);
      navigate(option.destination, { replace: true });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Demo NeverFade gagal dibuka. Coba lagi.");
      setLoadingKey(null);
    }
  }

  return (
    <main className="demo-home">
      <aside className="demo-sidebar">
        <div className="demo-sidebar-brand">
          <BrandMark />
          <span><strong>NeverFade</strong><small>POS</small></span>
        </div>

        <nav className="demo-nav" aria-label="Demo navigation">
          <a className="active" href="#demo"><LayoutGrid aria-hidden="true" />Demo</a>
          <a href="#features"><Sparkles aria-hidden="true" />Features</a>
          <a href="#pricing"><BadgeDollarSign aria-hidden="true" />Pricing</a>
          <a href="#how-it-works"><PlayCircle aria-hidden="true" />How It Works</a>
          <a href="#faq"><CircleHelp aria-hidden="true" />FAQ</a>
        </nav>

        <div className="demo-sidebar-bottom">
          <Link className="demo-login-link" to="/login"><LogIn aria-hidden="true" /><span>Masuk Merchant</span></Link>
          <a className="demo-start-button" href="#demo">Mulai Demo <ArrowRight aria-hidden="true" /></a>
          <small>Tanpa menyentuh data asli.</small>
        </div>
      </aside>

      <section className="demo-main">
        <div className="demo-content" id="demo">
          <header className="demo-page-header">
            <span className="demo-overline">NEVERFADE POS</span>
            <h1>Demo</h1>
            <p>Pilih jenis bisnis. Kami akan menyiapkan pengalaman POS yang paling relevan untuk kamu.</p>
          </header>

          <section className="demo-showcase" aria-label="Pilih demo bisnis">
            <div className="demo-section-heading">
              <div>
                <span>COBA SEKARANG</span>
                <h2>Pilih bisnis kamu</h2>
              </div>
            </div>

            <div className="demo-card-row">
              {demoOptions.map((option) => {
                const loading = loadingKey === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className="demo-category-card"
                    disabled={Boolean(loadingKey)}
                    onClick={() => void chooseDemo(option)}
                  >
                    <img className="demo-category-image" src={option.image} alt="" loading="eager" />
                    <div className="demo-category-overlay" aria-hidden="true" />
                    <div className="demo-category-copy">
                      <span className="demo-category-kicker">{option.kicker}</span>
                      <h3>{option.title}</h3>
                      <p>{option.description}</p>
                      <div className="demo-category-tags">
                        {option.features.map(({ label, icon: Icon }) => (
                          <span key={label}><Icon aria-hidden="true" />{label}</span>
                        ))}
                      </div>
                    </div>
                    <span className="demo-category-cta">
                      {loading ? "Menyiapkan demo…" : "Buka Demo"}
                      {!loading ? <ArrowRight aria-hidden="true" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {error ? <div className="demo-picker-error" role="alert">{error}</div> : null}
          </section>

          <section className="demo-features-section" id="features">
            <div className="demo-list-title">
              <h2>Yang bisa kamu coba</h2>
              <span>Semua fitur <ArrowRight aria-hidden="true" /></span>
            </div>
            <div className="demo-feature-grid">
              {features.map(({ title, copy, icon: Icon }) => (
                <div className="demo-feature-item" key={title}>
                  <span className="demo-feature-icon"><Icon aria-hidden="true" /></span>
                  <span className="demo-feature-copy"><strong>{title}</strong><small>{copy}</small></span>
                </div>
              ))}
            </div>
          </section>

          <section className="demo-simple-section" id="pricing">
            <span className="demo-overline">PRICING</span>
            <h2>Sederhana dari awal.</h2>
            <p>Pilih paket sesuai skala bisnis tanpa mengubah cara tim kamu bekerja.</p>
            <a href="#faq">Lihat detail pricing <ArrowRight aria-hidden="true" /></a>
          </section>

          <section className="demo-how-section" id="how-it-works">
            <div className="demo-list-title"><h2>Cara kerjanya</h2></div>
            <div className="demo-steps">
              <div><span>01</span><strong>Pilih bisnis</strong><small>NeverFade menyesuaikan workflow demo.</small></div>
              <div><span>02</span><strong>Coba transaksi</strong><small>Eksplor kasir, operasional, dan laporan.</small></div>
              <div><span>03</span><strong>Siap digunakan</strong><small>Setup tenant asli saat kamu siap.</small></div>
            </div>
          </section>

          <section className="demo-faq-section" id="faq">
            <div>
              <span className="demo-overline">FAQ</span>
              <h2>Demo aman untuk dicoba.</h2>
            </div>
            <div className="demo-faq-copy">
              <p><strong>Apakah data demo masuk ke data merchant?</strong><br />Tidak. Seluruh transaksi demo menggunakan lingkungan simulasi terpisah.</p>
              <p><strong>Perlu akun?</strong><br />Tidak. Pilih kategori bisnis dan demo langsung disiapkan.</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
