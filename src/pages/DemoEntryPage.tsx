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
    description: "Atur meja, teruskan pesanan ke dapur, terima pembayaran, dan pantau penjualan dari satu tempat.",
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
    description: "Transaksi lebih cepat, stok otomatis ikut ter-update, laporan tetap rapi.",
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
    description: "Kelola ukuran, warna, stok, dan harga tanpa bikin kasir ribet.",
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
    description: "Terima cucian, pantau proses, catat pembayaran, sampai siap diambil.",
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
    description: "Kelola layanan, pelanggan, staf, dan pembayaran dalam satu alur.",
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
  { title: "Kasir & Checkout", copy: "Catat transaksi dan terima pembayaran lebih cepat", icon: Receipt },
  { title: "Inventory", copy: "Stok otomatis bergerak setiap ada transaksi", icon: Boxes },
  { title: "Reports & Analytics", copy: "Lihat omzet dan performa tanpa rekap manual", icon: BarChart3 },
  { title: "Customer", copy: "Simpan data dan riwayat pelanggan", icon: Users },
  { title: "Staff & Roles", copy: "Atur akses tiap staf sesuai peran", icon: UserCog },
  { title: "QRIS & Payments", copy: "Terima QRIS dan metode pembayaran lain", icon: Wallet },
  { title: "Digital Receipt", copy: "Kirim struk tanpa harus cetak", icon: Receipt },
  { title: "Multi-price", copy: "Atur harga satuan, grosir, atau khusus", icon: PackageSearch },
  { title: "Kitchen Queue", copy: "Pesanan kasir langsung masuk antrean dapur", icon: CookingPot },
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
  const [loadedImages, setLoadedImages] = useState<Partial<Record<BusinessType, boolean>>>({});
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
          <a href="#features"><Sparkles aria-hidden="true" />Fitur</a>
          <a href="#pricing"><BadgeDollarSign aria-hidden="true" />Harga</a>
          <a href="#how-it-works"><PlayCircle aria-hidden="true" />Cara Kerja</a>
          <a href="#faq"><CircleHelp aria-hidden="true" />FAQ</a>
        </nav>

        <div className="demo-sidebar-bottom">
          <Link className="demo-login-link" to="/login"><LogIn aria-hidden="true" /><span>Masuk Merchant</span></Link>
          <a className="demo-start-button" href="#demo">Mulai Demo <ArrowRight aria-hidden="true" /></a>
          <small>Data demo terpisah dari data merchant.</small>
        </div>
      </aside>

      <section className="demo-main">
        <div className="demo-content" id="demo">
          <header className="demo-page-header">
            <span className="demo-overline">NEVERFADE POS</span>
            <h1>Demo</h1>
            <p>Pilih jenis usaha. NeverFade langsung menyesuaikan alur kasir dan operasionalnya—tanpa perlu daftar.</p>
          </header>

          <section className="demo-showcase" aria-label="Pilih demo bisnis">
            <div className="demo-section-heading">
              <div>
                <span>COBA LANGSUNG</span>
                <h2>Pilih jenis usahamu</h2>
              </div>
            </div>

            <div className="demo-card-row">
              {demoOptions.map((option, index) => {
                const loading = loadingKey === option.key;
                const imageLoaded = Boolean(loadedImages[option.key]);
                const smallImage = option.image.replace(".webp", "-720.webp");

                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`demo-category-card${imageLoaded ? " image-loaded" : ""}`}
                    disabled={Boolean(loadingKey)}
                    onClick={() => void chooseDemo(option)}
                  >
                    <div className="demo-category-copy">
                      <span className="demo-category-kicker">{option.kicker}</span>
                      <h3>{option.title}</h3>
                      <p>{option.description}</p>
                    </div>

                    <div className="demo-category-visual">
                      <div className="demo-category-shimmer" aria-hidden="true" />
                      <img
                        className="demo-category-image"
                        src={option.image}
                        srcSet={`${smallImage} 720w, ${option.image} 1448w`}
                        sizes="(max-width: 720px) 88vw, (max-width: 1000px) 72vw, 560px"
                        alt=""
                        loading={index < 2 ? "eager" : "lazy"}
                        fetchPriority={index < 2 ? "high" : "auto"}
                        decoding="async"
                        onLoad={() =>
                          setLoadedImages((current) =>
                            current[option.key] ? current : { ...current, [option.key]: true },
                          )
                        }
                      />
                    </div>

                    <div className="demo-category-footer">
                      <div className="demo-category-tags">
                        {option.features.map(({ label, icon: Icon }) => (
                          <span key={label}><Icon aria-hidden="true" />{label}</span>
                        ))}
                      </div>
                      <span className="demo-category-cta">
                        {loading ? "Menyiapkan demo…" : "Coba Demo"}
                        {!loading ? <ArrowRight aria-hidden="true" /> : null}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {error ? <div className="demo-picker-error" role="alert">{error}</div> : null}
          </section>

          <section className="demo-features-section" id="features">
            <div className="demo-list-title">
              <h2>Coba fitur utamanya</h2>
              <span>Lihat semua fitur <ArrowRight aria-hidden="true" /></span>
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
            <span className="demo-overline">HARGA</span>
            <h2>Pilih yang pas buat usahamu.</h2>
            <p>Mulai dari kebutuhan inti, lalu tambah fitur saat bisnismu berkembang.</p>
            <a href="#faq">Lihat detail harga <ArrowRight aria-hidden="true" /></a>
          </section>

          <section className="demo-how-section" id="how-it-works">
            <div className="demo-list-title"><h2>Cara kerjanya</h2></div>
            <div className="demo-steps">
              <div><span>01</span><strong>Pilih jenis usaha</strong><small>Demo langsung menyesuaikan alur operasionalnya.</small></div>
              <div><span>02</span><strong>Coba langsung</strong><small>Jalankan kasir, operasional, dan laporan seperti kondisi nyata.</small></div>
              <div><span>03</span><strong>Mulai saat siap</strong><small>Setup akun merchant tanpa membawa data demo.</small></div>
            </div>
          </section>

          <section className="demo-faq-section" id="faq">
            <div>
              <span className="demo-overline">FAQ</span>
              <h2>Coba bebas, data tetap terpisah.</h2>
            </div>
            <div className="demo-faq-copy">
              <p><strong>Apakah data demo masuk ke akun merchant?</strong><br />Tidak. Transaksi demo berjalan di lingkungan simulasi terpisah.</p>
              <p><strong>Perlu daftar dulu?</strong><br />Tidak. Pilih jenis usaha dan demo langsung bisa dicoba.</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
