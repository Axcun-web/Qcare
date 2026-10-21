# Pelatihan Model Prediksi Waktu Tunggu

Melatih model Random Forest untuk UC **Lihat Estimasi Waktu** memakai dataset
publik Hangu sebagai _proxy_ (pra-pelatihan) sampai log antrean Klinik Ayoda
tersedia di `ServiceHistory`.

```bash
cd prediction-service
.venv/Scripts/python training/train.py             # Hangu + Qcare (PostgreSQL), ±45 detik
.venv/Scripts/python training/train.py --no-qcare  # Hangu saja (= hasil model v2)
```

Data dimuat dinamis oleh `dataset.py` (Hangu diunduh otomatis + antrean SELESAI
Qcare); pembagian 80/20 per sesi dihitung dari data. Pelatihan juga dapat dipicu
lewat `POST /train` (lihat `../README.md`).

> Layanan FastAPI yang memuat `model.joblib` **wajib** memakai versi
> `scikit-learn` yang sama dengan `requirements.txt` (pickle tidak kompatibel
> antar versi).

## Dataset

Feng, H., Jia, Y., Zhou, S., Chen, H., & Huang, T. (2023). A Dataset of Service
Time and Related Patient Characteristics from an Outpatient Clinic. _Data_,
8(3), 47. https://doi.org/10.3390/data8030047 — data:
https://doi.org/10.5281/zenodo.7476233. Lisensi CC BY-NC-SA 4.0 (lihat
`data/LICENSE`, `data/HANGU_README.md`).

6.637 konsultasi, 381 sesi setengah hari (2018–2019), satu dokter. Kolom yang
dipakai hanya yang juga tersedia di Qcare: `Session`, `DayOfWeek`, `StartTime`,
`ServTime`. Karakteristik pasien (gender, kanker, alamat) sengaja tidak dipakai
karena tidak ada di input UC.

## Rekayasa fitur

| Input                    | Asal di Hangu                                                     | Peran            |
| ------------------------ | ----------------------------------------------------------------- | ---------------- |
| `queue_position`         | urutan `StartTime` dalam sesi (1-based)                           | fitur            |
| `patients_ahead`         | k − j untuk pasangan (j = sedang dilayani, k = pasien target)     | fitur            |
| `day_of_week`            | `DayOfWeek` (Senin=0)                                             | fitur            |
| `hour`                   | jam `StartTime` pasien j (saat prediksi dibuat)                   | fitur            |
| `doctor_avg_service_min` | rata-rata SELURUH `ServTime` sebelum j (kronologis, tanpa bocoran) | pengali (skala) |

**Target waktu tunggu** = `StartTime_k − StartTime_j` (menit). Setiap pasangan
(j, k) dalam sesi menjadi satu sampel (±57 ribu), mewakili estimasi yang
diperbarui setiap kali antrean maju; j = pasien pertama mewakili estimasi saat
pendaftaran. Dataset tidak punya jam kedatangan pasien, sehingga waktu tunggu
yang dimodelkan adalah waktu **hingga giliran dimulai**, bukan sejak registrasi.

**Target durasi pelayanan** = `ServTime` (menit).

**Normalisasi**: setiap model adalah `Pipeline(StandardScaler -> RandomForestRegressor)`,
jadi fitur dinormalisasi (z-score) di dalam model dan layanan cukup mengirim fitur mentah.
Random Forest invarian terhadap penskalaan; MAE/RMSE identik dengan dan tanpa scaler
(diverifikasi 2026-09-30). Scaler dipakai agar tahap normalisasi pada Bab 3 terimplementasi.

**Skala dokter**: kedua target dilatih sebagai **rasio terhadap rata-rata
jangka panjang dokter** lalu dikalikan kembali; rata-rata dokter tidak menjadi
fitur. Dua desain sebelumnya ditolak:

| Desain                                         | MAE   | Estimasi 5 pasien di depan, dokter 10 / 13,4 / 17 mnt |
| ---------------------------------------------- | ----- | ----------------------------------------------------- |
| Menit absolut, rata-rata 20 terakhir sbg fitur | 12,71 | tidak berubah (rasio 1,005 saat rata-rata dibagi dua) |
| Rasio, rata-rata 20 terakhir sbg fitur         | 12,83 | 66,9 / 73,7 / 70,1 (tidak monoton)                    |
| **Rasio, rata-rata jangka panjang sbg pengali** | 12,81 | 50,5 / 67,7 / 85,9 (proporsional)                     |

Dataset hanya berisi satu dokter, jadi variasi rata-rata 20 terakhir hanyalah
noise; sebagai fitur, model mempelajari regresi ke rata-rata dan membalik efek
kecepatan dokter.

**Monoton**: model waktu tunggu memakai `monotonic_cst` (naik) pada
`patients_ahead` dan `queue_position`, sehingga pasien yang lebih belakang
tidak pernah mendapat estimasi lebih pendek (tanpa batasan, estimasi turun pada
antrean > 22 pasien karena data jarang). Biaya: MAE 12,70 → 12,96.

## Evaluasi

Split **kronologis per sesi**: 80% sesi pertama (≤ 304) latih, 20% terakhir
(77 sesi) uji. Hyperparameter (`min_samples_leaf`, `max_features`) dipilih
dengan `GroupKFold(5)` per sesi pada data latih. Baseline = rumus fallback
Qcare `patients_ahead × doctor_avg_service_min` (rata-rata jangka panjang).

| Model waktu tunggu (n uji = 12.608) | MAE (menit) | RMSE (menit) | R²    |
| ----------------------------------- | ----------- | ------------ | ----- |
| Baseline rata-rata historis         | 13,90       | 18,80        | 0,908 |
| **Random Forest**                   | **12,96**   | **17,80**    | 0,917 |

Selisih MAE 0,94 menit (−6,7%); interval kepercayaan 95% (bootstrap per sesi,
5.000 ulangan) [0,17; 1,74] menit, jadi perbaikannya nyata tetapi moderat.

| Pasien di depan | n     | RF MAE | Baseline MAE |
| --------------- | ----- | ------ | ------------ |
| 1–3             | 3.774 | 7,98   | 7,92         |
| 4–8             | 4.750 | 13,31  | 14,09        |
| 9–15            | 3.460 | 16,90  | 18,56        |
| 16+             | 624   | 18,63  | 22,82        |

> Koreksi: versi awal melaporkan baseline 16,55 karena memakai rata-rata 20
> pelayanan terakhir (noisy). Baseline yang adil memakai rata-rata jangka
> panjang (13,90).

Model durasi pelayanan per pasien **tidak** lebih baik dari rata-rata
historis (MAE 4,81 vs 4,82; R² ≈ 0): tanpa karakteristik pasien, durasi satu
konsultasi pada dasarnya acak di sekitar rata-rata dokter. Nilainya hanya
dipakai untuk kolom `PredictionHistory.estimasiDurasiAntrean`.

Angka lengkap: `../model/metrics.json`. Kontrak input/output untuk FastAPI:
`../model/feature_spec.json`.

## Keterbatasan

- Satu dokter di Tiongkok; hari hanya Selasa/Rabu/Jumat/Sabtu (dominan Rabu &
  Sabtu), jam 08–20. Nilai di luar rentang ditandai out-of-distribution.
- `ServTime` di dataset adalah perkiraan (akhir konsultasi diaproksimasi).
- Model harus dilatih ulang pada `ServiceHistory` Klinik Ayoda setelah data
  cukup; `train.py` cukup diganti sumber datanya (kolom sama: sesi, hari, jam
  mulai, durasi).
