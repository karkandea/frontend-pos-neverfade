# HANDOFF — FE v5 → NEXT

## DONE

- Vite + TypeScript + Zustand
- Vanilla style.css di-import global
- API client
  - Bearer token otomatis
  - base URL dari VITE_API_URL
  - 401 handling
- Auth store
  - login
  - restore session via GET /api/auth/me
  - logout
- Login → backend terbukti jalan
- owner/owner123 berhasil login
- JWT tersimpan
- GET /api/products berhasil (200)
- AppShell dibuat
- Login UI mendekati vanilla (belum pixel-perfect)
- React activation untuk `.page.page-active` & `.content-section.active`
- ProductPage:
  - GET list
  - CREATE (POST)
  - EDIT (PUT)
  - DELETE
  - Search (`?search=`)
  - Filter kategori (`?kategori=`)
  - Modal vanilla (.open toggle)
  - Styling parity (form-grid 2 kolom + uppercase label)
  - DELETE sukses → refresh list
  - DELETE gagal → tampilkan `message` dari backend (409)

## NEXT

1. Pelanggan
2. Karyawan
3. Inventaris
4. Absensi
5. Laporan
6. Pengaturan
7. Dashboard polish (jika masih ada gap)
8. TransactionPage **PALING AKHIR** (lapor sebelum mulai)

## GOTCHAS

- Edit file pakai full rewrite (`cat > file <<'EOF'`), jangan `perl` / `sed -i` / regex patch.
- Modal vanilla pakai toggle class `.open`, bukan conditional render.
- Markup tetap mengikuti vanilla (`vanilla/index.html`) sebisa mungkin.
- Jangan klaim selesai tanpa:
  - build hijau
  - commit
  - data tampil / endpoint tervalidasi
- Backend:
  - DELETE produk yang memiliki riwayat stok/transaksi mengembalikan `409 Conflict`.
  - Frontend menampilkan `response.data.message` dari backend.
  - Keputusan soft delete masih di backend.

## VERIFY

```bash
npm run dev

Login:

owner
owner123

Verifikasi ProductPage:

List tampil
Create berhasil
Edit berhasil
Delete produk baru → sukses
Delete produk ber-riwayat → 409 + pesan backend tampil
Search menghasilkan GET /api/products?search=...
Filter kategori menghasilkan GET /api/products?kategori=...
Search + kategori bekerja bersamaan

