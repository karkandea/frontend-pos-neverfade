import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { BusinessType } from "../types/platform";
import { useAuthStore } from "../stores/auth";
import "./DemoEntryPage.css";

type DemoOption = {
  key: BusinessType;
  title: string;
  kicker: string;
  description: string;
  features: string[];
  destination: string;
  art: string;
};

const demoOptions: DemoOption[] = [
  {
    key: "food_beverage",
    kicker: "FOOD & BEVERAGE",
    title: "Restaurant, cafe, dan warung",
    description: "Kelola meja, pesanan, dapur, pembayaran, dan laporan dari satu tempat.",
    features: ["Meja", "Kitchen queue", "Kasir"],
    destination: "/meja",
    art: "food",
  },
  {
    key: "general_retail",
    kicker: "RETAIL",
    title: "Toko, minimarket, dan usaha harian",
    description: "Kasir cepat dengan stok real-time, pelanggan, dan laporan penjualan.",
    features: ["Kasir", "Inventory", "Laporan"],
    destination: "/kasir",
    art: "retail",
  },
  {
    key: "fashion_retail",
    kicker: "FASHION",
    title: "Butik, distro, dan fashion retail",
    description: "Atur varian ukuran, warna, stok, harga satuan, dan harga grosir.",
    features: ["Varian", "Multi harga", "Retur"],
    destination: "/kasir",
    art: "fashion",
  },
  {
    key: "laundry",
    kicker: "LAUNDRY",
    title: "Laundry kiloan sampai express",
    description: "Terima order, pantau proses cucian, customer, pembayaran, dan status.",
    features: ["Work order", "Status", "Pembayaran"],
    destination: "/laundry",
    art: "laundry",
  },
  {
    key: "salon_barbershop",
    kicker: "SERVICE",
    title: "Salon dan barbershop",
    description: "Kelola transaksi jasa, pelanggan, staff, dan histori layanan.",
    features: ["Jasa", "Customer", "Staff"],
    destination: "/kasir",
    art: "salon",
  },
];

const features = [
  ["Kasir & Checkout", "Transaksi cepat, diskon, dan pembayaran", "⌁"],
  ["Inventory", "Stok dan pergerakan barang real-time", "◫"],
  ["Reports & Analytics", "Pantau penjualan dan performa bisnis", "⌗"],
  ["Customer", "Profil, histori, dan data pelanggan", "◎"],
  ["Staff & Roles", "Atur akses dan aktivitas tim", "♙"],
  ["QRIS & Payments", "Beragam metode pembayaran", "▣"],
  ["Digital Receipt", "Struk yang mudah dibagikan", "▤"],
  ["Multi-price", "Harga satuan, grosir, dan variasi", "◇"],
  ["Kitchen Queue", "Alur pesanan kasir ke dapur", "♨"],
];

function BrandMark() {
  return (
    <span className="nf-brand-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

function DemoArt({ type }: { type: string }) {
  return (
    <div className={`demo-art demo-art-${type}`} aria-hidden="true">
      <div className="demo-art-glow" />
      <div className="demo-device">
        <div className="demo-device-top">
          <span className="demo-mini-brand"><BrandMark /> NeverFade</span>
          <span className="demo-mini-pill" />
        </div>
        <div className="demo-device-body">
          <div className="demo-device-nav">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="demo-device-content">
            <div className="demo-device-search" />
            <div className="demo-device-grid">
              <b />
              <b />
              <b />
              <b />
              <b />
              <b />
            </div>
          </div>
        </div>
      </div>
      <div className="demo-art-orb demo-art-orb-one" />
      <div className="demo-art-orb demo-art-orb-two" />
    </div>
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
          <a className="active" href="#demo"><span>▦</span>Demo</a>
          <a href="#features"><span>◇</span>Features</a>
          <a href="#pricing"><span>♢</span>Pricing</a>
          <a href="#how-it-works"><span>▷</span>How It Works</a>
          <a href="#faq"><span>?</span>FAQ</a>
        </nav>

        <div className="demo-sidebar-bottom">
          <Link className="demo-login-link" to="/login">↗ <span>Masuk Merchant</span></Link>
          <a className="demo-start-button" href="#demo">Mulai Demo</a>
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
              <span className="demo-scroll-note">Geser untuk melihat lainnya →</span>
            </div>

            <div className="demo-card-row">
              {demoOptions.map((option) => {
                const loading = loadingKey === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`demo-category-card demo-category-${option.art}`}
                    disabled={Boolean(loadingKey)}
                    onClick={() => void chooseDemo(option)}
                  >
                    <div className="demo-category-copy">
                      <span className="demo-category-kicker">{option.kicker}</span>
                      <h3>{option.title}</h3>
                      <p>{option.description}</p>
                      <div className="demo-category-tags">
                        {option.features.map((feature) => <span key={feature}>{feature}</span>)}
                      </div>
                    </div>
                    <DemoArt type={option.art} />
                    <span className="demo-category-cta">
                      {loading ? "Menyiapkan demo…" : "Buka demo"} <b>→</b>
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
              <span>Semua fitur →</span>
            </div>
            <div className="demo-feature-grid">
              {features.map(([title, copy, icon]) => (
                <div className="demo-feature-item" key={title}>
                  <span className="demo-feature-icon">{icon}</span>
                  <span className="demo-feature-copy"><strong>{title}</strong><small>{copy}</small></span>
                  <span className="demo-more">•••</span>
                </div>
              ))}
            </div>
          </section>

          <section className="demo-simple-section" id="pricing">
            <span className="demo-overline">PRICING</span>
            <h2>Sederhana dari awal.</h2>
            <p>Pilih paket sesuai skala bisnis tanpa mengubah cara tim kamu bekerja.</p>
            <a href="#faq">Lihat detail pricing <b>→</b></a>
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
