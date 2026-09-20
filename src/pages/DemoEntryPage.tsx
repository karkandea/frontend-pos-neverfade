import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { BusinessType } from "../types/platform";
import { useAuthStore } from "../stores/auth";
import "./DemoEntryPage.css";

type DemoOption = {
  key: BusinessType;
  title: string;
  examples: string;
  features: string[];
  icon: string;
  destination: string;
};

const demoOptions: DemoOption[] = [
  {
    key: "food_beverage",
    title: "F&B",
    examples: "Restoran · Cafe · Coffee shop",
    features: ["Meja & pesanan", "Antrean dapur", "Kasir"],
    icon: "☕",
    destination: "/meja",
  },
  {
    key: "general_retail",
    title: "Retail / Toko",
    examples: "Warung · Minimarket · Toko umum",
    features: ["Kasir", "Stok & inventaris", "Laporan"],
    icon: "🏪",
    destination: "/kasir",
  },
  {
    key: "fashion_retail",
    title: "Fashion",
    examples: "Butik · Distro · Thrift",
    features: ["Ukuran & warna", "Multi harga", "Retur & tukar"],
    icon: "👕",
    destination: "/kasir",
  },
  {
    key: "laundry",
    title: "Laundry",
    examples: "Kiloan · Satuan · Express",
    features: ["Work order", "Status cucian", "Pembayaran"],
    icon: "🧺",
    destination: "/laundry",
  },
  {
    key: "salon_barbershop",
    title: "Salon & Barbershop",
    examples: "Salon · Barber · Hair studio",
    features: ["Kasir jasa", "Pelanggan", "Laporan"],
    icon: "✂️",
    destination: "/kasir",
  },
];

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
      setError(
        cause instanceof Error
          ? cause.message
          : "Demo NeverFade gagal dibuka. Coba lagi."
      );
      setLoadingKey(null);
    }
  }

  return (
    <main className="demo-picker-page">
      <section className="demo-picker-shell">
        <header className="demo-picker-header">
          <div className="demo-picker-brand">
            <span>NEVER</span>
            <strong>FADE.</strong>
          </div>

          <div className="demo-picker-eyebrow">DEMO INTERAKTIF</div>

          <h1>Bisnis kamu yang mana?</h1>
          <p>
            Pilih yang paling mirip. Demo akan menyesuaikan menu, data,
            dan alur kerja dengan jenis bisnismu.
          </p>
        </header>

        <div className="demo-picker-grid">
          {demoOptions.map((option) => {
            const loading = loadingKey === option.key;

            return (
              <button
                key={option.key}
                type="button"
                className="demo-business-card"
                disabled={Boolean(loadingKey)}
                onClick={() => void chooseDemo(option)}
              >
                <span className="demo-business-icon" aria-hidden="true">
                  {option.icon}
                </span>

                <span className="demo-business-copy">
                  <strong>{option.title}</strong>
                  <small>{option.examples}</small>
                </span>

                <span className="demo-business-features">
                  {option.features.map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </span>

                <span className="demo-business-cta">
                  {loading ? "Menyiapkan demo…" : "Coba demo"}
                  {!loading ? <span aria-hidden="true">→</span> : null}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="demo-picker-error" role="alert">
            {error}
          </div>
        ) : null}

        <footer className="demo-picker-footer">
          <span>Data sepenuhnya simulasi.</span>
          <span>Transaksi demo tidak menyentuh data merchant asli.</span>
        </footer>
      </section>
    </main>
  );
}
