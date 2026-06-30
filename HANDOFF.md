# HANDOFF — FE v1 → FE v2

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

## NEXT

1. PIXEL PASS shell
   - Sidebar 100% (seluruh SVG + markup)
   - Topbar 100%
   - Responsive sidebar
   - Role gating mengikuti DOM vanilla

2. Dashboard

3. Produk (markup vanilla + API)

4. Kasir

5. Inventaris

6. Pelanggan

7. Transaksi

8. Karyawan

9. Absensi

10. Laporan

11. Pengaturan

## GOTCHAS

- Sidebar dan Login masih kompromi.
- Masih ada SVG, markup, dan id yang belum 1:1 dengan vanilla/index.html.
- Target berikutnya adalah preserve UI 100%.
- Markup berasal dari proyek user; lakukan konversi HTML → JSX tanpa redesign.
- Backend boleh dimatikan saat migrasi UI murni.
- Backend harus dijalankan di http://localhost:5012 saat menguji endpoint.

## VERIFY

npm run dev

Login:

owner / owner123

Expected:

- Login berhasil
- Restore session via /auth/me
- Produk tampil dari backend
