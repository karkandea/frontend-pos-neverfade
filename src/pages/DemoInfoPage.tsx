import {
  BarChart3,
  Boxes,
  CookingPot,
  PackageSearch,
  Receipt,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import DemoShell from "../components/demo/DemoShell";
import DemoPricingSection from "./DemoPricingSection";
import "./DemoEntryPage.css";

type DemoInfoKind = "features" | "pricing" | "how-it-works" | "faq";

type DemoInfoPageProps = {
  kind: DemoInfoKind;
};

const features: { title: string; copy: string; icon: LucideIcon }[] = [
  { title: "Kasir & Checkout", copy: "Catat transaksi dan terima pembayaran lebih cepat", icon: Receipt },
  { title: "Inventory", copy: "Stok otomatis bergerak setiap ada transaksi", icon: Boxes },
  { title: "Reports & Analytics", copy: "Lihat omzet dan performa tanpa rekap manual", icon: BarChart3 },
  { title: "Customer", copy: "Simpan data dan riwayat pelanggan", icon: Users },
  { title: "Staff & Roles", copy: "Atur akses tiap staf sesuai peran", icon: UserCog },
  { title: "Pembayaran", copy: "Tunai bisa dicoba di demo; QRIS belum aktif pada demo publik", icon: Wallet },
  { title: "Struk Digital", copy: "Lihat struk transaksi yang berhasil dibayar", icon: Receipt },
  { title: "Multi-harga Fashion", copy: "Lihat harga satuan dan grosir pada kategori Fashion", icon: PackageSearch },
  { title: "Kitchen Queue", copy: "Pesanan kasir langsung masuk antrean dapur", icon: CookingPot },
];

export default function DemoInfoPage({ kind }: DemoInfoPageProps) {
  return (
    <DemoShell>
      {kind === "features" ? (
        <>
          <header className="demo-page-header demo-info-header">
            <span className="demo-overline">NEVERFADE POS</span>
            <h1>Fitur</h1>
            <p>Fitur inti untuk bantu operasional harian tetap rapi.</p>
          </header>
          <section className="demo-features-section demo-info-section">
            <div className="demo-feature-grid">
              {features.map(({ title, copy, icon: Icon }) => (
                <div className="demo-feature-item" key={title}>
                  <span className="demo-feature-icon"><Icon aria-hidden="true" /></span>
                  <span className="demo-feature-copy"><strong>{title}</strong><small>{copy}</small></span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {kind === "pricing" ? <DemoPricingSection /> : null}

      {kind === "how-it-works" ? (
        <>
          <header className="demo-page-header demo-info-header">
            <span className="demo-overline">NEVERFADE POS</span>
            <h1>Cara Kerja</h1>
            <p>Dari pilih jenis usaha sampai siap dipakai.</p>
          </header>
          <section className="demo-how-section demo-info-section">
            <div className="demo-steps">
              <div><span>01</span><strong>Pilih jenis usaha</strong><small>Demo menyesuaikan alur operasionalnya.</small></div>
              <div><span>02</span><strong>Coba langsung</strong><small>Jalankan kasir, operasional, dan laporan.</small></div>
              <div><span>03</span><strong>Mulai saat siap</strong><small>Setup akun merchant tanpa membawa data demo.</small></div>
            </div>
          </section>
        </>
      ) : null}

      {kind === "faq" ? (
        <>
          <header className="demo-page-header demo-info-header">
            <span className="demo-overline">NEVERFADE POS</span>
            <h1>FAQ</h1>
            <p>Hal yang paling sering ditanyakan soal demo NeverFade.</p>
          </header>
          <section className="demo-faq-section demo-info-section">
            <div className="demo-faq-copy">
              <p><strong>Apakah data demo masuk ke akun merchant?</strong><br />Tidak. Transaksi demo berjalan di lingkungan simulasi terpisah.</p>
              <p><strong>Perlu daftar dulu?</strong><br />Tidak. Pilih jenis usaha dan demo langsung bisa dicoba.</p>
            </div>
          </section>
        </>
      ) : null}
    </DemoShell>
  );
}
