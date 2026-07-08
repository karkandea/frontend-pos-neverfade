# HANDOFF — FE v6 → v7

## DONE

Semua page berikut sudah selesai, build hijau, dan di-commit:

- Product
  - CRUD
  - Search
  - Filter kategori
  - Modal vanilla (.open)
  - DELETE 409 handling
- Pelanggan
  - CRUD
  - Search
- Karyawan
  - CRUD
  - Search
  - Filter status
- Inventaris
  - Master stok (/api/products)
  - Stock adjustment (/api/stock-history)
  - Riwayat mutasi
- Pengaturan
  - GET /api/settings
  - PUT /api/settings
- Absensi
  - GET list
  - Check In
  - Check Out
- Dashboard
  - Summary
  - Chart (canvas salvage)
  - Top Products
  - Activity placeholder
  - Tanpa Chart.js/Recharts

Semua page:
- Wire API selesai
- Build hijau
- Commit per halaman
- Mengikuti layout vanilla semampunya

## NEXT (v7)

TINGGAL SATU PAGE:

### TransactionPage

WAJIB rewrite TOTAL.

File lama (`src/pages/TransactionPage.tsx`, ±333 baris) adalah prototype lama dan HARUS dibuang seluruhnya.

JANGAN dipatch.

Isinya mengandung:
- ledger
- event sourcing
- idempotencyKey
- version
- tenantId
- profit
- payload berbeda dari CONTRACT

Rewrite dari nol mengikuti:

- CONTRACT backend
- API-CONTRACT.md
- vanilla/index.html (Kasir/POS)

Payload checkout wajib:

{
  customerId,
  items,
  subtotal,
  disc,
  tax,
  discAmt,
  taxAmt,
  total,
  metodePembayaran,
  dibayar,
  kembalian
}

Response:

{
  id,
  noTrx,
  total
}

## GOTCHAS

- Edit file hanya via full rewrite:
  - cat >
  - cat >>
- DILARANG:
  - perl
  - sed -i
  - regex patch
- Modal menggunakan toggle class `.open`
- Jangan install library baru
- Jangan tambah fitur di luar vanilla
- Jangan buat:
  - hold
  - shift
  - ledger
  - event sourcing
  - idempotency
- TransactionPage adalah page terakhir dan paling sensitif.

## STATUS

FE v6 selesai.

Yang tersisa hanya TransactionPage.
