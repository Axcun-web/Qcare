# Qcare

E-Application antrean poliklinik berbasis prediksi waktu tunggu.
<!-- Studi kasus: Klinik Ayoda, Alam Sutera, Tangerang Selatan. -->
<!-- keep -->

Repositori ini merupakan implementasi dari perancangan sistem pada skripsi
"E-Application Antrean Poliklinik Berbasis Prediksi Waktu Tunggu".

> **Status: fitur utama sudah berjalan** (lihat [Status Implementasi](#status-implementasi)).
> Pasien mengambil antrean dan memantau estimasi waktu tunggu, Petugas
> mengelola antrean dan jadwal, Super Admin mengelola klinik dan akun.

## Tech Stack

| Lapisan         | Teknologi                                            | Referensi skripsi          |
| --------------- | ---------------------------------------------------- | -------------------------- |
| Frontend        | React.js (Vite)                                      | Bab 2 §2.1.6               |
| Backend         | Express.js + Node.js                                 | Bab 2 §2.1.5, §2.1.7       |
| Pola arsitektur | MVC (routes → controllers → services → repositories) | Bab 2 §2.1.9               |
| Database        | PostgreSQL + Prisma ORM                              | Bab 2 §2.1.4, Bab 3 §3.1.4 |
| Model prediksi  | Python (Random Forest) via FastAPI                   | Bab 2 §2.1.3, §2.1.8       |

## Required

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (untuk database)
- Node.js >= 20 (diuji pada v22.12.0)

Tidak perlu memasang PostgreSQL secara manual — database dijalankan melalui Docker untuk kolaborasi

## Setup

### 1. Database

Dari root repositori:

```bash
docker compose up -d
```

Perintah ini menjalankan PostgreSQL 17 pada **port 5433** (bukan 5432, agar
tidak bentrok dengan PostgreSQL lokal yang mungkin sudah terpasang).

| Perintah                 | Keterangan                                  |
| ------------------------ | ------------------------------------------- |
| `docker compose up -d`   | Menjalankan database                        |
| `docker compose ps`      | Memeriksa status container                  |
| `docker compose stop`    | Menghentikan tanpa menghapus data           |
| `docker compose down -v` | Menghentikan **dan menghapus** seluruh data |

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env          # nilai default sudah cocok dengan docker-compose
npx prisma migrate dev        # membuat tabel sesuai skema
npm run prisma:seed           # akun demo + klinik, dokter, jadwal contoh
npm run dev                   # http://localhost:4000
```

#### Akun demo

Dibuat oleh `npm run prisma:seed` (`backend/prisma/seed.js`). Seed aman
dijalankan berulang kali dan tidak menimpa password akun yang sudah ada.

| Role       | Email               | Password       | Catatan                          |
| ---------- | ------------------- | -------------- | -------------------------------- |
| SUPERADMIN | `admin@gmail.com`   | `admin12345`   | Akses `/admin`                   |
| PETUGAS    | `petugas@gmail.com` | `petugas12345` | Ditugaskan ke Klinik Qcare Pusat |
| PASIEN     | `pasien@gmail.com`  | `pasien12345`  | Sudah punya data pasien sendiri  |

Kredensial ini **hanya untuk pengembangan lokal**; seed menolak berjalan
saat `NODE_ENV=production`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                   # http://localhost:5173
```

## Struktur Proyek

```
Qcare/
├── docker-compose.yml   # PostgreSQL untuk pengembangan
├── backend/             # Express.js REST API
│   ├── prisma/
│   │   ├── schema.prisma    # Skema basis data (turunan ERD Bab 3)
│   │   └── migrations/      # Riwayat migrasi — WAJIB di-commit
│   └── src/
│       ├── config/          # Konfigurasi environment & Prisma client
│       ├── routes/          # Definisi endpoint (routing saja)
│       ├── controllers/     # Request handler (lapisan HTTP)
│       ├── services/        # Business logic
│       ├── repositories/    # Akses data via Prisma
│       ├── middleware/      # Auth, validasi, error handler
│       ├── validators/      # Skema validasi Zod
│       └── utils/
├── frontend/            # React.js SPA (Vite): halaman Pasien, Petugas, Super Admin
└── prediction-service/  # FastAPI + Random Forest: estimasi waktu tunggu
```

## API

Semua endpoint diawali `/api`. "Token" = header `Authorization: Bearer <JWT>`
dari login.

### Autentikasi & akun

| Method | Endpoint            | Akses      | Keterangan                                      |
| ------ | ------------------- | ---------- | ----------------------------------------------- |
| POST   | `/auth/register`    | Publik     | Registrasi akun pasien (Tabel 3.2)              |
| POST   | `/auth/login`       | Publik     | Autentikasi, mengembalikan JWT (Tabel 3.3)      |
| GET    | `/auth/me`          | Semua role | Profil pengguna yang sedang login               |
| PATCH  | `/auth/me`          | Semua role | Ubah nama + konfirmasi (Tabel 3.21)             |
| PATCH  | `/auth/me/password` | Semua role | Ubah password, password lama wajib (Tabel 3.22) |

### Antrean

| Method | Endpoint              | Akses                  | Keterangan                                                                                       |
| ------ | --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/queues/doctors`     | Publik                 | Dokter aktif + jadwal praktik                                                                    |
| POST   | `/queues`             | Pasien                 | Ambil antrean: dokter, jadwal, `tanggal` (hari ini s.d. +7 hari)                                 |
| POST   | `/queues/walk-in`     | Petugas, Admin         | Daftarkan pasien walk-in untuk hari ini                                                          |
| GET    | `/queues/mine`        | Pasien                 | Antrean milik pasien + posisi, estimasi, jam dipanggil                                           |
| GET    | `/queues/dashboard`   | Pasien                 | Data beranda pasien (antrean aktif, riwayat, info klinik)                                        |
| GET    | `/queues/patients`    | Pasien                 | Data pasien (diri sendiri / orang lain) yang tersimpan                                           |
| GET    | `/queues/staff?date=` | Petugas, Admin         | Daftar antrean klinik pada satu tanggal                                                          |
| PATCH  | `/queues/:id/arrival` | Petugas, Admin         | Catat kedatangan pasien online                                                                   |
| PATCH  | `/queues/:id/reschedule` | Petugas, Admin | Pindahkan antrean MENUNGGU ke tanggal lain: `tanggal`, `jadwalId` opsional; nomor baru, pasien online dinotifikasi (Tabel 3.16) |
| PATCH  | `/queues/:id/status`  | Pasien, Petugas, Admin | Ubah status; `alasan` wajib untuk `DILEWATI`. Aturan transisi: `backend/src/utils/queueRules.js` |

### Klinik, notifikasi, feedback

| Method | Endpoint                  | Akses      | Keterangan                                                                 |
| ------ | ------------------------- | ---------- | -------------------------------------------------------------------------- |
| GET    | `/clinics`                | Publik     | Klinik + dokter + jadwal                                                   |
| GET    | `/notifications`          | Semua role | Notifikasi pengguna                                                        |
| PATCH  | `/notifications/:id/read` | Semua role | Tandai satu notifikasi dibaca                                              |
| PATCH  | `/notifications/read-all` | Semua role | Tandai semua dibaca                                                        |
| POST   | `/feedback`               | Semua role | Kirim feedback: `isi` 10–1000 karakter, `rating` 1–5 opsional (Tabel 3.11) |

### Petugas

| Method | Endpoint               | Akses   | Keterangan                                                |
| ------ | ---------------------- | ------- | --------------------------------------------------------- |
| GET    | `/petugas/clinic`      | Petugas | Klinik petugas + dokter + jadwal                          |
| PATCH  | `/petugas/clinic`      | Petugas | Ubah info klinik                                          |
| POST   | `/petugas/doctors`     | Petugas | Tambah dokter                                             |
| PATCH  | `/petugas/doctors/:id` | Petugas | Ubah / aktifkan / nonaktifkan dokter                      |
| DELETE | `/petugas/doctors/:id` | Petugas | Nonaktifkan dokter (ditolak bila masih ada antrean aktif) |

### Super Admin (`/admin`)

| Method | Endpoint                               | Akses                | Keterangan                                                                               |
| ------ | -------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/admin/overview`                      | Super Admin          | Beranda (Gbr 3.83): total klinik/dokter/petugas/pasien, klinik teramai, feedback terbaru |
| GET    | `/admin/clinics`, `/admin/clinics/:id` | Super Admin          | Daftar / detail klinik                                                                   |
| POST   | `/admin/clinics`                       | Super Admin          | Tambah klinik                                                                            |
| PATCH  | `/admin/clinics/:id`                   | Super Admin          | Ubah klinik                                                                              |
| DELETE | `/admin/clinics/:id`                   | Super Admin          | Hapus klinik (ditolak bila sudah ada riwayat antrean)                                    |
| POST   | `/admin/clinics/:id/doctors`           | Super Admin          | Tambah dokter ke klinik                                                                  |
| POST   | `/admin/clinics/:id/staff`             | Super Admin          | Tambah akun petugas (Tabel 3.19)                                                         |
| GET    | `/admin/doctors`                       | Super Admin          | Semua dokter                                                                             |
| PATCH  | `/admin/doctors/:id`                   | Super Admin          | Ubah / aktifkan / nonaktifkan dokter                                                     |
| DELETE | `/admin/doctors/:id`                   | Super Admin          | Nonaktifkan dokter (ditolak bila masih ada antrean aktif)                                |
| POST   | `/admin/doctors/:id/jadwal`            | Super Admin, Petugas | Tambah jadwal praktik (Petugas: klinik sendiri; tidak boleh bentrok)                     |
| PATCH  | `/admin/jadwal/:id`                    | Super Admin, Petugas | Ubah jadwal                                                                              |
| DELETE | `/admin/jadwal/:id`                    | Super Admin, Petugas | Hapus jadwal (ditolak bila sudah ada riwayat antrean)                                    |
| GET    | `/admin/users?q=&role=&status=&page=`  | Super Admin          | Daftar pengguna dengan pencarian, filter, dan halaman (20/hal)                           |
| PATCH  | `/admin/users/:id`                     | Super Admin          | Ubah data pengguna. Menonaktifkan pengguna yang aktif dalam 5 menit terakhir → 409 `USER_ACTIVE_NOW`; ulangi dengan `?force=true` setelah konfirmasi (Tabel 3.19) |
| DELETE | `/admin/users/:id`                     | Super Admin          | Nonaktifkan pengguna (akses langsung berakhir); peringatan `USER_ACTIVE_NOW` sama seperti di atas |
| POST   | `/admin/users/:id/reset-password`      | Super Admin          | Reset password, mengembalikan password sementara (Tabel 3.19)                            |
| GET    | `/admin/feedback`                      | Super Admin          | Semua feedback                                                                           |

Registrasi mandiri selalu menghasilkan role `PASIEN`. Akun `PETUGAS` dibuat
Super Admin (Tabel 3.19). Tidak ada Lupa Password mandiri: Super Admin
memberikan password sementara.

## Catatan untuk Kolaborator

- **`.env` tidak di-commit.** Selalu mulai dari `.env.example`.
  Untuk `JWT_SECRET` sendiri:
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- **Folder `prisma/migrations/` WAJIB di-commit.** Setelah `git pull` yang
  memuat migrasi baru, jalankan `npx prisma migrate dev` agar skema lokal
  ikut diperbarui.
- **Kredensial database pada `docker-compose.yml` hanya untuk pengembangan
  lokal** dan sengaja di-commit agar setup tim seragam. Jangan dipakai di
  staging maupun produksi.
- Setelah mengubah `schema.prisma`, jalankan `npx prisma generate` agar
  Prisma Client ikut diperbarui.

## Status Implementasi

- [x] Struktur proyek & konfigurasi
- [x] Database via Docker Compose
- [x] Skema basis data (10 tabel, turunan ERD Bab 3)
- [x] Registrasi & Login (JWT, 3 role: Pasien / Petugas / Super Admin)
- [x] Frontend: halaman Pasien, Petugas, dan Super Admin
- [x] Modul antrean: ambil antrean dengan tanggal kunjungan (hari ini s.d.
      +7 hari), walk-in, panggil / layani / selesai / lewati (dengan alasan)
      / batal, aturan transisi status
- [x] Modul jadwal praktik & data master (klinik, dokter, petugas), cek
      jadwal bentrok
- [x] Integrasi layanan prediksi FastAPI: estimasi menit + jam dipanggil,
      fallback rata-rata historis, log PredictionHistory, pelatihan ulang
- [x] Notifikasi (polling 30 detik) dan pembaruan status antrean otomatis
      (15 detik)
- [x] Ubah nama, ubah password, reset password oleh Super Admin
- [x] Beranda Super Admin (statistik, klinik teramai, feedback terbaru)
- [x] Petugas memindahkan tanggal antrean yang masih menunggu (Tabel 3.16)
- [x] Akun nonaktif langsung kehilangan akses (status dicek setiap request) dan peringatan saat menonaktifkan pengguna yang sedang memakai aplikasi (Tabel 3.19)
