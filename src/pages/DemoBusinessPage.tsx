import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  CookingPot,
  LayoutDashboard,
  PackageSearch,
  Receipt,
  Scissors,
  Shirt,
  UserRound,
  Users,
  WashingMachine,
  ArrowRight,
  Compass,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

import DemoShell from "../components/demo/DemoShell";
import {
  clearDemoScope,
  setDemoScope,
  type DemoPersona,
} from "../lib/demoScope";
import type { BusinessType } from "../types/platform";
import { useAuthStore } from "../stores/auth";
import { findDemoJourney } from "../lib/demoJourney";
import { trackDemo } from "../lib/demoAnalytics";
import "./DemoEntryPage.css";
import "./DemoBusinessPage.css";

type DemoApp = {
  title: string;
  description: string;
  destination: string;
  icon: LucideIcon;
  persona?: DemoPersona;
};

type BusinessDemo = {
  businessType: BusinessType;
  title: string;
  description: string;
  apps: DemoApp[];
};

const businessDemos: Record<string, BusinessDemo> = {
  restaurant: {
    businessType: "food_beverage",
    title: "Cafe, restoran, dan warung",
    description: "Pilih bagian bisnis yang ingin kamu coba.",
    apps: [
      {
        title: "Terima Pesanan",
        description: "Meja dan transaksi pelanggan",
        destination: "/kasir",
        icon: Receipt,
        persona: "cashier",
      },
      {
        title: "Kelola Dapur",
        description: "Antrean dan status pesanan dapur",
        destination: "/dapur",
        icon: CookingPot,
        persona: "kitchen",
      },
      {
        title: "Pantau Usaha",
        description: "Operasional, laporan, dan tim",
        destination: "/dashboard",
        icon: LayoutDashboard,
        persona: "owner",
      },
    ],
  },
  retail: {
    businessType: "general_retail",
    title: "Toko dan minimarket",
    description: "Pilih bagian bisnis yang ingin kamu coba.",
    apps: [
      { title: "Jual Barang", description: "Buat transaksi harian", destination: "/kasir", icon: Receipt },
      { title: "Kelola Stok", description: "Cek barang dan persediaan", destination: "/inventaris", icon: Boxes },
      { title: "Pantau Usaha", description: "Penjualan dan laporan", destination: "/dashboard", icon: BarChart3 },
    ],
  },
  fashion: {
    businessType: "fashion_retail",
    title: "Butik dan distro",
    description: "Pilih bagian bisnis yang ingin kamu coba.",
    apps: [
      { title: "Jual Barang", description: "Buat transaksi harian", destination: "/kasir", icon: Receipt },
      { title: "Atur Produk & Harga", description: "Lihat ukuran, warna dan tingkat harga", destination: "/retail/variants-pricing", icon: Shirt },
      { title: "Kelola Stok", description: "Barang dan persediaan", destination: "/inventaris", icon: PackageSearch },
      { title: "Pantau Usaha", description: "Penjualan dan laporan", destination: "/dashboard", icon: LayoutDashboard },
    ],
  },
  laundry: {
    businessType: "laundry",
    title: "Laundry kiloan dan express",
    description: "Pilih bagian bisnis yang ingin kamu coba.",
    apps: [
      { title: "Terima Cucian", description: "Catat order pelanggan", destination: "/laundry", icon: UserRound },
      { title: "Proses Cucian", description: "Pantau status order", destination: "/laundry", icon: WashingMachine },
      { title: "Terima Pembayaran", description: "Pembayaran dan struk", destination: "/kasir", icon: Receipt },
      { title: "Pantau Usaha", description: "Penjualan dan laporan", destination: "/dashboard", icon: LayoutDashboard },
    ],
  },
  salon: {
    businessType: "salon_barbershop",
    title: "Salon dan barbershop",
    description: "Pilih bagian bisnis yang ingin kamu coba.",
    apps: [
      { title: "Terima Pembayaran", description: "Catat layanan dan pembayaran", destination: "/kasir", icon: Scissors },
      { title: "Kenali Pelanggan", description: "Data dan riwayat pelanggan", destination: "/pelanggan", icon: Users },
      { title: "Kelola Tim", description: "Staf dan absensi", destination: "/karyawan", icon: UserRound },
      { title: "Pantau Usaha", description: "Penjualan dan laporan", destination: "/dashboard", icon: LayoutDashboard },
    ],
  },
};

businessDemos.barbershop = { ...businessDemos.salon, title: "Barbershop" };

export default function DemoBusinessPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const enterDemo = useAuthStore((state) => state.enterDemo);
  const [loadingApp, setLoadingApp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [freeOpen, setFreeOpen] = useState(false);
  const demo = useMemo(() => businessDemos[slug], [slug]);
  const journey = findDemoJourney(slug);

  if (!demo) {
    return (
      <DemoShell>
        <header className="demo-page-header">
          <h1>Demo tidak ditemukan</h1>
          <p>Pilih jenis usaha dari halaman demo.</p>
        </header>
      </DemoShell>
    );
  }

  async function openApp(app: DemoApp) {
    if (loadingApp || !demo) return;
    setLoadingApp(app.title);
    setError("");

    try {
      await enterDemo(demo.businessType);
      if (journey) trackDemo("demo_started", journey.slug, "free");

      if (app.persona) {
        setDemoScope({ persona: app.persona, businessSlug: slug });
      } else {
        clearDemoScope();
      }

      navigate(app.destination, { replace: true });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Demo NeverFade gagal dibuka. Coba lagi.");
      setLoadingApp(null);
    }
  }

  async function startGuided() {
    if (!journey || !demo || loadingApp) return;
    setLoadingApp("guided");
    setError("");
    sessionStorage.removeItem(`nfpos_demo_guided_${journey.slug}`);
    trackDemo("demo_mode_selected", journey.slug, "guided");
    try {
      await enterDemo(demo.businessType);
      clearDemoScope();
      trackDemo("demo_started", journey.slug, "guided");
      navigate(`/demo/guide/${journey.slug}`, { replace: true });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Demo belum bisa dibuka. Coba lagi.");
      setLoadingApp(null);
    }
  }

  return (
    <DemoShell>
      <button className="demo-business-back" type="button" onClick={() => navigate("/demo")}>
        <ArrowLeft aria-hidden="true" />
        Semua demo
      </button>

      <header className="demo-page-header demo-business-header">
        <span className="demo-overline">PILIH CARA MENCOBA</span>
        <h1>{demo.title}</h1>
        <p>{journey?.benefit ?? demo.description}</p>
      </header>

      <section className="demo-mode-grid" aria-label="Pilih pengalaman demo">
        <button
          type="button"
          className="demo-mode-card demo-mode-card--recommended"
          disabled={Boolean(loadingApp)}
          onClick={() => void startGuided()}
        >
          <span className="demo-mode-badge">DIREKOMENDASIKAN</span>
          <span className="demo-mode-title"><CheckCircle2 aria-hidden="true" /> Demo Terpandu</span>
          <span className="demo-mode-description">
            Coba satu skenario bisnis yang nyata, selangkah demi selangkah. Tanpa tutorial panjang.
          </span>
          <span className="demo-mode-detail">{journey?.guidedTitle}</span>
          <span className="demo-mode-cta">
            {loadingApp === "guided" ? "Menyiapkan demo…" : "Mulai Demo Terpandu"}
            <ArrowRight aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          className="demo-mode-card"
          disabled={Boolean(loadingApp)}
          onClick={() => {
            if (journey) trackDemo("demo_mode_selected", journey.slug, "free");
            setFreeOpen((value) => !value);
          }}
          aria-expanded={freeOpen}
        >
          <span className="demo-mode-title"><Compass aria-hidden="true" /> Eksplorasi Bebas</span>
          <span className="demo-mode-description">
            Langsung masuk ke aplikasi yang ingin kamu lihat dan coba sendiri fiturnya.
          </span>
          <span className="demo-mode-detail">Pilih aktivitas yang mau kamu coba.</span>
          <span className="demo-mode-cta demo-mode-cta--light">
            {freeOpen ? "Tutup pilihan aktivitas" : "Pilih aktivitas"}
            <ArrowRight aria-hidden="true" />
          </span>
        </button>
      </section>

      {freeOpen ? (
        <section className="demo-free-section" aria-label={`Eksplorasi bebas ${demo.title}`}>
          <h2>Apa yang ingin kamu lakukan?</h2>
          <div className="demo-app-grid">
            {demo.apps.map((app) => {
              const Icon = app.icon;
              const loading = loadingApp === app.title;
              return (
                <button
                  key={`${app.title}-${app.destination}`}
                  type="button"
                  className="demo-app-card"
                  disabled={Boolean(loadingApp)}
                  aria-busy={loading}
                  onClick={() => void openApp(app)}
                >
                  <span className="demo-app-icon"><Icon aria-hidden="true" /></span>
                  <span className="demo-app-copy">
                    <strong>{app.title}</strong>
                    <small>{loading ? "Menyiapkan demo…" : app.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <p className="demo-mode-footnote">Tanpa registrasi · Data simulasi · Bebas berpindah mode</p>

      {error ? <div className="demo-picker-error" role="alert">{error}</div> : null}
    </DemoShell>
  );
}
