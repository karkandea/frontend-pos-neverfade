import { useState } from "react";
import { useNavigate } from "react-router-dom";

import DemoShell from "../components/demo/DemoShell";
import type { BusinessType } from "../types/platform";
import { useAuthStore } from "../stores/auth";
import "./DemoEntryPage.css";

type DemoOption = {
  key: BusinessType;
  title: string;
  description: string;
  destination: string;
  image: string;
};

const demoOptions: DemoOption[] = [
  {
    key: "food_beverage",
    title: "Cafe, restoran, dan warung",
    description: "Meja, dapur, kasir, dan pembayaran.",
    destination: "/meja",
    image: "/demo-assets/cafe.webp",
  },
  {
    key: "general_retail",
    title: "Toko dan minimarket",
    description: "Kasir cepat, stok otomatis, laporan rapi.",
    destination: "/kasir",
    image: "/demo-assets/minimarket.webp",
  },
  {
    key: "fashion_retail",
    title: "Butik dan distro",
    description: "Ukuran, warna, stok, dan harga.",
    destination: "/kasir",
    image: "/demo-assets/fashion.webp",
  },
  {
    key: "laundry",
    title: "Laundry kiloan dan express",
    description: "Order, proses cucian, sampai pickup.",
    destination: "/laundry",
    image: "/demo-assets/laundry.webp",
  },
  {
    key: "salon_barbershop",
    title: "Salon dan barbershop",
    description: "Layanan, staf, pelanggan, dan pembayaran.",
    destination: "/kasir",
    image: "/demo-assets/salon.webp",
  },
];

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
    <DemoShell>
      <header className="demo-page-header">
        <span className="demo-overline">NEVERFADE POS</span>
        <h1>Demo</h1>
        <p>Pilih jenis usaha, lalu coba alur POS-nya langsung.</p>
      </header>

      <section className="demo-showcase demo-showcase-clean" aria-label="Pilih demo bisnis">
        <div className="demo-card-row">
          {demoOptions.map((option, index) => {
            const loading = loadingKey === option.key;
            const imageLoaded = Boolean(loadedImages[option.key]);
            const smallImage = option.image.replace(".webp", "-720.webp");

            return (
              <button
                key={option.key}
                type="button"
                className={`demo-category-card demo-category-card-apple${imageLoaded ? " image-loaded" : ""}`}
                disabled={Boolean(loadingKey)}
                aria-busy={loading}
                aria-label={`Coba demo ${option.title}`}
                onClick={() => void chooseDemo(option)}
              >
                <div className="demo-category-shimmer" aria-hidden="true" />
                <img
                  className="demo-category-image"
                  src={option.image}
                  srcSet={`${smallImage} 720w, ${option.image} 1448w`}
                  sizes="(max-width: 720px) 86vw, (max-width: 1000px) 68vw, 510px"
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
                <div className="demo-category-bottom-fade" aria-hidden="true" />
                <div className="demo-category-text">
                  <strong>{option.title}</strong>
                  <span>{loading ? "Menyiapkan demo…" : option.description}</span>
                </div>
              </button>
            );
          })}
        </div>

        {error ? <div className="demo-picker-error" role="alert">{error}</div> : null}
      </section>
    </DemoShell>
  );
}
