import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import DemoShell from "../components/demo/DemoShell";
import "./DemoEntryPage.css";

type Category = {
  slug: string;
  label: string;
  description: string;
  icon: string;
  highlights: [string, string, string];
};

const categories: Category[] = [
  {
    slug: "restaurant",
    label: "F&B",
    description: "Restoran · Kafe · Coffee shop",
    icon: "restaurant",
    highlights: ["Meja & pesanan", "Antrean dapur", "Kasir & laporan"],
  },
  {
    slug: "retail",
    label: "Retail & Minimarket",
    description: "Warung · Toko · Minimarket",
    icon: "minimarket",
    highlights: ["Kasir cepat", "Stok & inventaris", "Laporan penjualan"],
  },
  {
    slug: "fashion",
    label: "Fashion",
    description: "Butik · Distro · Thrift",
    icon: "fashion",
    highlights: ["Varian ukuran & warna", "Harga satuan & grosir", "Retur & tukar"],
  },
  {
    slug: "laundry",
    label: "Laundry",
    description: "Kiloan · Satuan · Express",
    icon: "laundry",
    highlights: ["Penerimaan order", "Status cucian", "Pembayaran & struk"],
  },
  {
    slug: "salon",
    label: "Salon & Barbershop",
    description: "Salon · Barber · Hair studio",
    icon: "salon",
    highlights: ["Kasir layanan", "Pelanggan & riwayat", "Tim & laporan"],
  },
];

export default function DemoEntryPage() {
  useEffect(() => {
    // The merchant POS globally locks page scrolling. Only the marketing demo
    // picker needs document scrolling on compact screens.
    document.documentElement.classList.add("nf-demo-picker-active");
    document.body.classList.add("nf-demo-picker-active");
    return () => {
      document.documentElement.classList.remove("nf-demo-picker-active");
      document.body.classList.remove("nf-demo-picker-active");
    };
  }, []);

  return (
    <DemoShell cinematic>
      <div className="nf-cinematic-picker">
        <header className="nf-cinematic-header">
          <span className="nf-cinematic-eyebrow">NEVERFADE POS · DEMO INTERAKTIF</span>
          <h1>POS untuk bisnis kamu.</h1>
          <p>Pilih jenis usaha, lalu coba alur kerja yang sesuai—langsung dengan data simulasi.</p>
        </header>

        <section className="nf-cinematic-panel" aria-label="Pilih jenis usaha">
          <div className="nf-cinematic-panel-head">
            <span>PILIH JENIS USAHA</span>
          </div>

          <div className="nf-cinematic-grid">
            {categories.map(({ slug, label, description, icon, highlights }) => (
              <Link
                key={slug}
                to={`/demo/business/${slug}`}
                className="nf-cinematic-card"
                aria-label={`Coba gratis demo ${label}`}
              >
                <span className="nf-cinematic-card-header">
                  <span className="nf-cinematic-icon" aria-hidden="true">
                    <img
                      src={`/demo-icons/${icon}-idle.png`}
                      width="56"
                      height="56"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="nf-cinematic-card-title">
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                </span>

                <ul className="nf-cinematic-features">
                  {highlights.map((feature) => (
                    <li key={feature}><Check aria-hidden="true" />{feature}</li>
                  ))}
                </ul>

                <span className="nf-cinematic-cta">
                  Coba Gratis <ArrowRight size={17} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <p className="nf-cinematic-note">Tanpa registrasi · Data demo terpisah dari data merchant</p>
      </div>
    </DemoShell>
  );
}
