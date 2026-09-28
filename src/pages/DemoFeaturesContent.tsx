import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, BarChart3, Boxes, ClipboardList, CookingPot, CreditCard, PackageSearch, Receipt, Scissors, Shirt, Users, WashingMachine, type LucideIcon } from "lucide-react";
import { demoJourneys, type DemoBusinessSlug } from "../lib/demoJourney";
import "./DemoFeaturesContent.css";

type Feature = { name: string; detail: string; icon: LucideIcon };
type Section = { slug: DemoBusinessSlug; summary: string; features: Feature[] };

const sections: Section[] = [
  { slug: "restaurant", summary: "Pesanan meja bergerak dari kasir ke dapur, lalu ditutup setelah pembayaran.", features: [
    { name: "Meja & pesanan", detail: "Buka pesanan berdasarkan meja dan tambahkan menu.", icon: ClipboardList },
    { name: "Antrean dapur", detail: "Lihat pesanan masuk dan ubah status persiapannya.", icon: CookingPot },
    { name: "Pembayaran & struk", detail: "Selesaikan pesanan dan lihat bukti transaksi.", icon: Receipt },
  ] },
  { slug: "retail", summary: "Jual barang harian sambil memantau stok yang terhubung ke transaksi.", features: [
    { name: "Kasir barang", detail: "Pilih barang dari katalog dan catat pembayaran.", icon: CreditCard },
    { name: "Katalog produk", detail: "Kelola barang dan informasi produk yang dijual.", icon: Boxes },
    { name: "Stok & riwayat", detail: "Periksa persediaan dan transaksi yang tercatat.", icon: BarChart3 },
  ] },
  { slug: "fashion", summary: "Kelola produk fashion dengan varian dan pilihan harga.", features: [
    { name: "Ukuran & warna", detail: "Lihat pilihan varian produk fashion.", icon: Shirt },
    { name: "Harga satuan & grosir", detail: "Atur tingkat harga sesuai cara penjualan.", icon: PackageSearch },
    { name: "Penjualan & stok", detail: "Catat transaksi dan periksa persediaan.", icon: Receipt },
  ] },
  { slug: "laundry", summary: "Catat cucian masuk, ikuti prosesnya, lalu selesaikan pembayarannya.", features: [
    { name: "Terima cucian", detail: "Buat order dengan layanan dan estimasi selesai.", icon: ClipboardList },
    { name: "Status pengerjaan", detail: "Pantau cucian hingga siap diambil.", icon: WashingMachine },
    { name: "Pembayaran order", detail: "Hubungkan pembayaran dengan pesanan laundry.", icon: CreditCard },
  ] },
  { slug: "salon", summary: "Catat layanan salon dan riwayat pelanggan dalam satu tempat.", features: [
    { name: "Kasir layanan", detail: "Pilih layanan dan selesaikan pembayaran.", icon: Scissors },
    { name: "Data pelanggan", detail: "Lihat data serta riwayat pelanggan.", icon: Users },
    { name: "Tim & laporan", detail: "Kelola staf dan periksa transaksi usaha.", icon: BarChart3 },
  ] },
  { slug: "barbershop", summary: "Kelola layanan barber, pembayaran, dan data pelanggan.", features: [
    { name: "Layanan barber", detail: "Catat layanan potong rambut atau grooming.", icon: Scissors },
    { name: "Data pelanggan", detail: "Simpan data dan lihat riwayat pelanggan.", icon: Users },
    { name: "Tim & laporan", detail: "Pantau staf dan transaksi usaha.", icon: BarChart3 },
  ] },
];

export default function DemoFeaturesContent() {
  return <div className="nf-features-page">
    <header className="nf-features-header">
      <span className="nf-cinematic-eyebrow">NEVERFADE POS · FITUR</span>
      <h1>Fitur yang sesuai dengan cara usahamu bekerja.</h1>
      <p>Pilih jenis usaha untuk melihat alur dan fitur yang bisa kamu coba di demo.</p>
    </header>
    <nav className="nf-features-chooser" aria-label="Pilih kategori fitur">
      {demoJourneys.map((journey) => <a className="nf-features-choice" href={`#fitur-${journey.slug}`} key={journey.slug}>
        <span className="nf-features-choice-icon" aria-hidden="true"><img src={`/demo-icons/${journey.icon}-idle.png`} width="44" height="44" alt="" loading="lazy" /></span>
        <span>{journey.title}</span><ArrowDown size={16} aria-hidden="true" />
      </a>)}
    </nav>
    <div className="nf-features-sections">
      {sections.map(({ slug, summary, features }) => {
        const journey = demoJourneys.find((item) => item.slug === slug)!;
        return <section id={`fitur-${slug}`} className="nf-features-section" key={slug} aria-labelledby={`fitur-title-${slug}`}>
          <div className="nf-features-section-intro">
            <span className="nf-features-kicker">FITUR UNTUK {journey.title.toUpperCase()}</span>
            <h2 id={`fitur-title-${slug}`}>{journey.title}</h2><p>{summary}</p>
            <Link to={`/demo/business/${slug}`} className="nf-features-link">Coba demo {journey.title} <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <ul className="nf-features-list">{features.map(({ name, detail, icon: Icon }) => <li key={name}>
            <span className="nf-features-icon"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
            <span><strong>{name}</strong><small>{detail}</small></span>
          </li>)}</ul>
        </section>;
      })}
    </div>
    <p className="nf-features-note">Fitur mengikuti jenis usaha. Pembayaran tunai dapat dicoba di demo publik.</p>
  </div>;
}
