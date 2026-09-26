# NeverFade Demo — Mengisi Paket & Harga

Hanya edit `src/config/demoPricing.ts`. Daftar paket akan muncul otomatis di `/demo/pricing`.

Untuk setiap paket, isi `name`, `description`, `monthlyPrice` (angka rupiah tanpa `Rp` dan titik), `billingLabel` (mis. `/bulan`), dan `features`. Ubah `isFinal: true` **hanya setelah penawaran komersial disetujui**. Selama `monthlyPrice: null` atau `isFinal: false`, halaman menampilkan `Rp —` dan `Harga belum final`; angka contoh tidak akan tampak sebagai harga resmi.

Tambah/hapus objek dalam `demoPricingPlans` jika jumlah paket berubah. Semua halaman memakai layout yang sama, tanpa perlu edit JSX/CSS untuk mengisi data.

Untuk mengaktifkan tombol konsultasi WhatsApp, pasang nomor sales resmi di build environment `VITE_DEMO_SALES_WHATSAPP=628...` lalu build/deploy frontend demo. Bila kosong, tombol konsultasi **tidak muncul**; tombol `Coba Demo` tetap bekerja. Jangan memasukkan nomor pribadi/asal.

Deployment demo build: `VITE_DEMO_MODE=true VITE_API_URL='' npm run build`. Jangan deploy perubahan placeholder ke production merchant tanpa approval harga.
