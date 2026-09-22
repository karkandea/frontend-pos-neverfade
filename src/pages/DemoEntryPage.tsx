import { useState } from "react";
import { useNavigate } from "react-router-dom";

import DemoShell from "../components/demo/DemoShell";
import "./DemoEntryPage.css";

type DemoOption = {
  key: string;
  title: string;
  description: string;
  destination: string;
  image: string;
};

const demoOptions: DemoOption[] = [
  {
    key: "restaurant",
    title: "Cafe, restoran, dan warung",
    description: "Meja, dapur, kasir, dan pembayaran.",
    destination: "/demo/business/restaurant",
    image: "/demo-assets/cafe.webp",
  },
  {
    key: "retail",
    title: "Toko dan minimarket",
    description: "Kasir cepat, stok otomatis, laporan rapi.",
    destination: "/demo/business/retail",
    image: "/demo-assets/minimarket.webp",
  },
  {
    key: "fashion",
    title: "Butik dan distro",
    description: "Ukuran, warna, stok, dan harga.",
    destination: "/demo/business/fashion",
    image: "/demo-assets/fashion.webp",
  },
  {
    key: "laundry",
    title: "Laundry kiloan dan express",
    description: "Order, proses cucian, sampai pickup.",
    destination: "/demo/business/laundry",
    image: "/demo-assets/laundry.webp",
  },
  {
    key: "salon",
    title: "Salon dan barbershop",
    description: "Layanan, staf, pelanggan, dan pembayaran.",
    destination: "/demo/business/salon",
    image: "/demo-assets/salon.webp",
  },
];

export default function DemoEntryPage() {
  const navigate = useNavigate();
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

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
            const imageLoaded = Boolean(loadedImages[option.key]);
            const smallImage = option.image.replace(".webp", "-720.webp");

            return (
              <button
                key={option.key}
                type="button"
                className={`demo-category-card demo-category-card-apple${imageLoaded ? " image-loaded" : ""}`}
                aria-label={`Pilih demo ${option.title}`}
                onClick={() => navigate(option.destination)}
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
                  <span>{option.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </DemoShell>
  );
}
