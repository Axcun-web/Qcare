# Qcare

E-Application antrean poliklinik berbasis prediksi waktu tunggu.
<!-- Studi kasus: Klinik Ayoda, Alam Sutera, Tangerang Selatan. -->

Repositori ini merupakan implementasi dari perancangan sistem pada skripsi
"E-Application Antrean Poliklinik Berbasis Prediksi Waktu Tunggu".

> **Status: kerangka proyek (template).**
> Backend berisi fondasi + modul autentikasi. Frontend baru berisi konfigurasi
> build. Modul antrean, jadwal praktik, data master, notifikasi, dan layanan
> prediksi belum diimplementasikan.

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
npm run prisma:seed           # akun SUPERADMIN + data master (lihat di bawah)
npm run dev                   # http://localhost:4000
```

#### Akun SUPERADMIN & data seed

Registrasi mandiri **selalu** menghasilkan role `PASIEN`, dan akun `SUPERADMIN`
hanya bisa dibuat oleh `SUPERADMIN` lain — jadi tanpa seed tidak ada cara masuk
ke `/admin`. `prisma/seed.js` menyediakan akun pertama itu:

| Field    | Nilai             |
| -------- | ----------------- |
| Email    | `admin@gmail.com` |
| Password | `admin12345`      |
| Role     | `SUPERADMIN`      |

Seed juga membuat 1 klinik, 1 dokter, dan 3 jadwal praktik — tanpa itu `/admin`
tampil kosong dan `GET /api/queues/doctors` tidak mengembalikan apa pun.

- Seed **idempotent**: aman dijalankan berulang kali.
- Pada akun yang sudah ada, **password tidak ditimpa** — hanya role yang
  ditegakkan. Jadi jika Anda sudah memakai `admin@gmail.com` dengan password
  sendiri, password itu tetap berlaku.
- `npx prisma migrate reset` menjalankan seed **otomatis** setelah migrasi,
  sehingga akun admin selalu tersedia kembali setelah reset.
- Seed menolak berjalan bila `NODE_ENV=production`.

Kredensial di atas adalah kredensial **pengembangan lokal** dan sengaja
di-commit agar setup tim seragam, mengikuti preseden `docker-compose.yml`.
Jangan dipakai untuk staging maupun produksi.

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
└── frontend/            # React.js SPA (kerangka build)
```

## API

| Method | Endpoint             | Akses       | Keterangan                                 |
| ------ | -------------------- | ----------- | ------------------------------------------ |
| POST   | `/api/auth/register` | Publik      | Registrasi akun pasien (Tabel 3.2)         |
| POST   | `/api/auth/login`    | Publik      | Autentikasi, mengembalikan JWT (Tabel 3.3) |
| GET    | `/api/auth/me`       | Perlu token | Profil pengguna yang sedang login          |

Registrasi mandiri selalu menghasilkan role `PASIEN`. Akun `PETUGAS` dan
`SUPERADMIN` dibuat oleh Super Admin melalui modul Manage Akun Petugas
(Tabel 3.19), yang belum diimplementasikan.

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
- [ ] Frontend (routing, halaman, state)
- [ ] Modul antrean (buat, monitor, kelola)
- [ ] Modul jadwal praktik & data master
- [ ] Integrasi layanan prediksi FastAPI
- [ ] Notifikasi real-time
