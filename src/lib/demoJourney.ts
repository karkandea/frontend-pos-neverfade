import type { BusinessType } from "../types/platform";

export type DemoBusinessSlug = "restaurant" | "retail" | "fashion" | "laundry" | "salon";

export type DemoJourney = {
  slug: DemoBusinessSlug;
  businessType: BusinessType;
  title: string;
  examples: string;
  benefit: string;
  icon: string;
  actions: [string, string, string];
  guidedTitle: string;
  guidedDescription: string;
  guidedOutcome: string;
};

export const demoJourneys: DemoJourney[] = [
  {
    slug: "restaurant", businessType: "food_beverage", title: "Restoran & Kafe",
    examples: "Restoran · Kafe · Coffee shop", benefit: "Kelola pesanan sampai pembayaran.", icon: "restaurant",
    actions: ["Buat pesanan meja", "Kirim pesanan ke dapur", "Terima pembayaran"],
    guidedTitle: "Dari meja ke laporan, dalam satu alur.",
    guidedDescription: "Buat pesanan, kirim ke dapur, selesaikan pembayaran tunai, lalu lihat bukti transaksi.",
    guidedOutcome: "Pesanan ditutup dan transaksi tersimpan untuk laporan.",
  },
  {
    slug: "retail", businessType: "general_retail", title: "Retail & Minimarket",
    examples: "Warung · Toko · Minimarket", benefit: "Transaksi cepat, stok langsung tercatat.", icon: "minimarket",
    actions: ["Pilih produk", "Selesaikan pembayaran", "Lihat stok dan transaksi"],
    guidedTitle: "Jual satu barang, lihat stok berubah.",
    guidedDescription: "Pilih barang dari katalog simulasi, lakukan pembayaran tunai, lalu periksa hasilnya.",
    guidedOutcome: "Transaksi tercatat dan stok produk otomatis berkurang.",
  },
  {
    slug: "fashion", businessType: "fashion_retail", title: "Fashion",
    examples: "Butik · Distro · Thrift", benefit: "Penjualan dan persediaan lebih rapi.", icon: "fashion",
    actions: ["Pilih produk", "Buat transaksi", "Periksa stok penjualan"],
    guidedTitle: "Jual produk, lihat perubahan stok.",
    guidedDescription: "Coba penjualan fashion menggunakan barang simulasi; fitur varian dan grosir tersedia di eksplorasi bebas.",
    guidedOutcome: "Penjualan tersimpan dan stok produk terbarui.",
  },
  {
    slug: "laundry", businessType: "laundry", title: "Laundry",
    examples: "Kiloan · Satuan · Express", benefit: "Pantau cucian dari terima hingga ambil.", icon: "laundry",
    actions: ["Terima order pelanggan", "Ubah status cucian", "Terima pembayaran"],
    guidedTitle: "Terima cucian sampai selesai dibayar.",
    guidedDescription: "Catat pesanan, proses dan tandai siap, lalu selesaikan pembayaran tunai.",
    guidedOutcome: "Work order selesai, riwayat status dan pembayaran tersimpan.",
  },
  {
    slug: "salon", businessType: "salon_barbershop", title: "Salon & Barbershop",
    examples: "Salon · Barber · Hair studio", benefit: "Catat layanan dan pembayaran pelanggan.", icon: "salon",
    actions: ["Pilih layanan", "Terima pembayaran", "Lihat transaksi"],
    guidedTitle: "Dari layanan ke transaksi tercatat.",
    guidedDescription: "Coba kasir jasa menggunakan layanan simulasi, lalu cek transaksi di sistem.",
    guidedOutcome: "Pembayaran layanan tersimpan tanpa mengurangi stok barang.",
  },
];

export function findDemoJourney(slug: string): DemoJourney | undefined {
  return demoJourneys.find((x) => x.slug === slug);
}
