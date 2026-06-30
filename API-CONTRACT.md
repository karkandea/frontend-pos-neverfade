# JANGAN EDIT

# API-CONTRACT — NEVERFADE POS Frontend

Sumber kebenaran:
1. CONTRACT.md backend
2. Backend .NET yang berjalan

## Base URL

- Environment variable:
  VITE_API_URL

Development:

http://localhost:5012

Tidak boleh hardcode URL di source code.

---

## Authentication

POST /api/auth/login

Request

{
  "username": "owner",
  "password": "owner123"
}

Response

{
  "token": "...",
  "user": {
    "id": "...",
    "nama": "...",
    "username": "...",
    "role": "owner"
  }
}

GET /api/auth/me

Response

{
  "id": "...",
  "nama": "...",
  "username": "...",
  "role": "owner"
}

Semua endpoint selain login wajib mengirim

Authorization: Bearer {token}

401:
- hapus token
- reset auth store
- redirect ke /login

---

## Role Gating

Kasir menyembunyikan menu:

- Karyawan
- Absensi
- Pengguna
- Pengaturan

Backend tetap menjadi enforcement utama.

---

## Token

Disimpan hanya sebagai:

localStorage["nfpos_token"]

User TIDAK disimpan di localStorage.

User selalu diambil ulang dari GET /api/auth/me saat aplikasi boot.

---

## Network Error

Jika request gagal karena network:

"Gagal terhubung ke server. Coba lagi."

Tidak ada offline mode.
