# Qcare Prediction Service

Layanan FastAPI yang menyajikan model Random Forest estimasi waktu tunggu
(UC **Lihat Estimasi Waktu**). Pelatihan model: lihat `training/README.md`.

## Menjalankan

```bash
cd prediction-service
py -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --port 8000
.venv/Scripts/python -m pytest -q tests   # uji API terhadap model asli
```

Backend Express memanggil layanan ini lewat `PREDICTION_SERVICE_URL`
(`backend/.env`). Pakai `http://127.0.0.1:8000`, bukan `localhost`: Node
me-resolve `localhost` ke `::1` (IPv6) sedangkan uvicorn hanya mendengarkan
IPv4, sehingga setiap panggilan akan jatuh ke fallback.

## Endpoint

| Method | Path             | Keterangan                                              |
| ------ | ---------------- | ------------------------------------------------------- |
| GET    | `/health`        | `loaded`, `model_version`, `cold_start_avg_service_min` |
| POST   | `/predict`       | satu pasien                                             |
| POST   | `/predict/batch` | `{ "items": [...] }`, maks. 200, urutan dipertahankan   |
| POST   | `/train`         | latih ulang di latar belakang; header `X-Train-Token`, body opsional `{ "force": true }` |
| GET    | `/train/status`  | status pelatihan terakhir + versi model yang sedang dipakai |

Input: `queue_position`, `patients_ahead` (termasuk pasien yang sedang
dilayani), `day_of_week` (Senin=0), `hour` (jam WIB saat prediksi),
`doctor_avg_service_min` (rata-rata jangka panjang seluruh durasi pelayanan
dokter; hanya pengali, bukan fitur model).

Output: `estimated_wait_min`, `estimated_service_min`, `model_version`,
`out_of_distribution` (input di luar rentang data latih, mis. hari Senin).

## Integrasi dan fallback

`backend/src/services/prediction.service.js` menghitung ulang estimasi semua
antrean aktif pada satu sesi dokter setiap kali antrean dibuat atau statusnya
berubah, lalu mencatatnya ke `PredictionHistory.sumberEstimasi`:

| Nilai            | Kapan                                                           |
| ---------------- | --------------------------------------------------------------- |
| `ML`             | layanan ini merespons                                           |
| `HISTORICAL_AVG` | layanan tidak terjangkau/timeout 1,5 dtk; dokter punya riwayat  |
| `DEFAULT`        | sama, tetapi dokter belum punya riwayat (cold start 13,451 mnt) |

Fallback = `patients_ahead × doctor_avg_service_min`.

## Pelatihan ulang dinamis

1. **Pemicu.** Saat petugas menekan **Selesai**, backend mengirim `POST /train`
   (fire-and-forget, token `PREDICTION_TRAIN_TOKEN` di `backend/.env`; layanan
   ini membaca file yang sama).
2. **Ambang.** Tanpa `force`, pelatihan dilewati bila antrean Qcare SELESAI baru
   sejak model terakhir < `RETRAIN_MIN_NEW_RECORDS` (default 10). Skripsi
   menyebut model dilatih ulang setiap "Selesai"; ambang ini mengelompokkannya
   agar efisien (satu pelatihan ±45 detik CPU).
3. **Muat data** (`training/dataset.py`): Hangu (diunduh dari Zenodo bila belum
   ada, diverifikasi SHA-256) + antrean SELESAI Qcare dari PostgreSQL. Sesi Qcare
   = jadwal + tanggal; fitur dihitung dalam WIB, urut waktu mulai dilayani.
4. **Bagi 80/20 per sesi** secara kronologis; cutoff dihitung dari data
   (Hangu saja: latih sesi <= 304, uji > 304).
5. **Latih & evaluasi** di data latih/uji (MAE/RMSE vs baseline, per sumber).
   Model yang dipasang dilatih ulang pada SELURUH data.
6. **Pasang.** Model baru menggantikan model lama tanpa restart, kecuali bila
   data uji Qcare >= 30 pasangan dan MAE Qcare-nya lebih buruk dari model lama.
   Pantau dengan `GET /train/status`.

Manual: `.venv/Scripts/python training/train.py` (`--no-qcare` = Hangu saja,
`--test-fraction 0.2`, `--force`).



