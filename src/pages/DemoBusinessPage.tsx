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
        title: "Kasir",
        description: "Kasir, meja, dan transaksi",
        destination: "/kasir",
        icon: Receipt,
        persona: "cashier",
      },
      {
        title: "Kitchen",
        description: "Antrean dan status pesanan dapur",
        destination: "/dapur",
        icon: CookingPot,
        persona: "kitchen",
      },
      {
        title: "Owner",
        description: "Operasional, laporan, tim, dan keuangan",
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
      { title: "Kasir", description: "Transaksi harian", destination: "/kasir", icon: Receipt },
      { title: "Stok", description: "Barang & persediaan", destination: "/inventaris", icon: Boxes },
      { title: "Owner", description: "Penjualan & laporan", destination: "/dashboard", icon: BarChart3 },
    ],
  },
  fashion: {
    businessType: "fashion_retail",
    title: "Butik dan distro",
    description: "Pilih bagian bisnis yang ingin kamu coba.",
    apps: [
      { title: "Kasir", description: "Transaksi harian", destination: "/kasir", icon: Receipt },
      { title: "Produk & Varian", description: "Ukuran, warna & harga", destination: "/retail/variants-pricing", icon: Shirt },
      { title: "Stok", description: "Barang & persediaan", destination: "/inventaris", icon: PackageSearch },
      { title: "Owner", description: "Penjualan & laporan", destination: "/dashboard", icon: LayoutDashboard },
    ],
  },
  laundry: {
    businessType: "laundry",
    title: "Laundry kiloan dan express",
    description: "Pilih bagian bisnis yang ingin kamu coba.",
    apps: [
      { title: "Front Desk", description: "Terima order pelanggan", destination: "/laundry", icon: UserRound },
      { title: "Proses Laundry", description: "Pantau status cucian", destination: "/laundry", icon: WashingMachine },
      { title: "Kasir", description: "Pembayaran & struk", destination: "/kasir", icon: Receipt },
      { title: "Owner", description: "Penjualan & laporan", destination: "/dashboard", icon: LayoutDashboard },
    ],
  },
  salon: {
    businessType: "salon_barbershop",
    title: "Salon dan barbershop",
    description: "Pilih bagian bisnis yang ingin kamu coba.",
    apps: [
      { title: "Kasir / Reception", description: "Layanan & pembayaran", destination: "/kasir", icon: Scissors },
      { title: "Pelanggan", description: "Data & riwayat kunjungan", destination: "/pelanggan", icon: Users },
      { title: "Staff", description: "Tim & absensi", destination: "/karyawan", icon: UserRound },
      { title: "Owner", description: "Penjualan & laporan", destination: "/dashboard", icon: LayoutDashboard },
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
  const demo = useMemo(() => businessDemos[slug], [slug]);

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

  return (
    <DemoShell>
      <button className="demo-business-back" type="button" onClick={() => navigate("/demo")}>
        <ArrowLeft aria-hidden="true" />
        Semua demo
      </button>

      <header className="demo-page-header demo-business-header">
        <span className="demo-overline">DEMO BISNIS</span>
        <h1>{demo.title}</h1>
        <p>{demo.description}</p>
      </header>

      <section className="demo-app-grid" aria-label={`Aplikasi demo ${demo.title}`}>
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
      </section>

      {error ? <div className="demo-picker-error" role="alert">{error}</div> : null}
    </DemoShell>
  );
}
