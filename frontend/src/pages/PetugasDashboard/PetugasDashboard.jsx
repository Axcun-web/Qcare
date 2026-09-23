import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import "./PetugasDashboard.css";
import PetugasNavbar from "../../components/PetugasNavbar";

const HARI_NAMES = [
  "MINGGU",
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
];

const HARI_LABEL = {
  SENIN: "Senin",
  SELASA: "Selasa",
  RABU: "Rabu",
  KAMIS: "Kamis",
  JUMAT: "Jumat",
  SABTU: "Sabtu",
  MINGGU: "Minggu",
};

const formatJamSlot = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
};

export default function PetugasDashboard() {
  const [queues, setQueues] = useState([]);
  const [message, setMessage] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInDoctorId, setWalkInDoctorId] = useState("");

  const [searchDoctor, setSearchDoctor] = useState("");
  const [filterDate, setFilterDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadQueue = useCallback(() => {
    api(`/queues/staff?date=${filterDate}`)
      .then((res) => {
        const queueData = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.queues)
          ? res.data.queues
          : [];
        setQueues(queueData);
      })
      .catch((err) => setMessage(err?.message || "Gagal memuat antrean"));
  }, [filterDate]);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  useEffect(() => {
    api("/petugas/clinic")
      .then((res) => {
        const docData = Array.isArray(res?.data?.doctors)
          ? res.data.doctors
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setDoctors(docData);
      })
      .catch((err) => setMessage(err?.message || "Gagal memuat data dokter"));
  }, []);

  const submitWalkIn = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api("/queues/walk-in", {
        method: "POST",
        body: JSON.stringify(data),
      });
      form.reset();
      setShowWalkIn(false);
      setWalkInDoctorId("");
      loadQueue();
      setMessage("Walk-in berhasil didaftarkan.");
    } catch (err) {
      setMessage(err?.message || "Gagal mendaftarkan walk-in");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api(`/queues/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      loadQueue();
      setMessage("Status antrean berhasil diperbarui.");
    } catch (err) {
      setMessage(err?.message || "Gagal memperbarui status");
    }
  };

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timeout);
  }, [message]);

  const todayHari = HARI_NAMES[new Date().getDay()];
  const walkInDoctor = doctors.find(
    (d) => String(d.id) === String(walkInDoctorId)
  );
  const todaySchedules = (walkInDoctor?.jadwalPraktik || []).filter(
    (j) => j.hari === todayHari
  );

  const safeQueues = Array.isArray(queues) ? queues : [];
  const safeDoctors = Array.isArray(doctors) ? doctors : [];

  const sisaAntrian = safeQueues.filter((q) => q.status === "MENUNGGU").length;
  const antrianAktif = safeQueues.find(
    (q) => q.status === "SEDANG_DIPANGGIL" || q.status === "SEDANG_DILAYANI"
  );
  const nomorSaatIni = antrianAktif ? antrianAktif.nomorAntrean : "-";

  const filteredDoctors = safeDoctors.filter((d) => {
    const qSearch = searchDoctor.toLowerCase();
    const nameMatch = (d.nama || "").toLowerCase().includes(qSearch);
    const specMatch = (d.spesialisasi || "").toLowerCase().includes(qSearch);
    return nameMatch || specMatch;
  });

  const filteredQueues = safeQueues.filter((q) => {
    const matchName = (q.recordPasien?.nama || "")
      .toLowerCase()
      .includes(searchName.toLowerCase());
    const matchStatus = statusFilter === "ALL" || q.status === statusFilter;
    return matchName && matchStatus;
  });

  const totalPages = Math.ceil(filteredQueues.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedQueues = filteredQueues.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, statusFilter, filterDate]);

  return (
    <div className="petugas-page">
      <PetugasNavbar />
      <main>
        <p className="petugas-kicker">MANAJEMEN ANTREAN</p>
        <h1>Dashboard Petugas</h1>

        {message && <div className="message">{message}</div>}

        <div className="petugas-stats">
          <div className="stat-card">
            <h3>Nomor Antrian Saat Ini</h3>
            <div className="value">{nomorSaatIni}</div>
          </div>
          <div className="stat-card">
            <h3>Sisa Antrian Hari Ini</h3>
            <div className="value">{sisaAntrian}</div>
          </div>
        </div>

        {/* --- JADWAL & STATUS ANTREAN PER DOKTER --- */}
        <div className="petugas-doctor-section">
          <div className="section-header-flex">
            <div>
              <h2>Jadwal & Status Antrean Dokter</h2>
              <p>
                Pantau beban antrean dan jadwal praktik per dokter untuk tanggal{" "}
                {filterDate}
              </p>
            </div>
            <div className="doctor-search-box">
              <input
                type="text"
                placeholder="Cari nama atau spesialisasi dokter..."
                value={searchDoctor}
                onChange={(e) => setSearchDoctor(e.target.value)}
              />
            </div>
          </div>

          <div className="doctor-grid">
            {filteredDoctors.length === 0 ? (
              <div className="empty-doctor-state">
                Tidak ada dokter yang sesuai dengan pencarian.
              </div>
            ) : filteredDoctors.map((doc) => {
              const docQueues = safeQueues.filter(
                (q) => q.doctorId === doc.id || q.doctor?.id === doc.id
              );
              const waitingCount = docQueues.filter(
                (q) => q.status === "MENUNGGU"
              ).length;
              const activeCount = docQueues.filter(
                (q) =>
                  q.status === "SEDANG_DIPANGGIL" ||
                  q.status === "SEDANG_DILAYANI"
              ).length;
              const completedCount = docQueues.filter(
                (q) => q.status === "SELESAI"
              ).length;

              return (
                <div key={doc.id} className="doctor-card">
                  <div className="doctor-card-header">
                    <div>
                      <strong className="doctor-card-name">
                        {doc.nama || "Dokter"}
                      </strong>
                      <span className="doctor-card-spec">
                        {doc.spesialisasi || "-"}
                      </span>
                    </div>
                    <span
                      className={`status-pill ${
                        doc.isActive ? "active" : "inactive"
                      }`}
                    >
                      {doc.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>

                  <div className="doctor-queue-metrics">
                    <div className="metric-box">
                      <span className="metric-num">{waitingCount}</span>
                      <span className="metric-lbl">Menunggu</span>
                    </div>
                    <div className="metric-box active-metric">
                      <span className="metric-num">{activeCount}</span>
                      <span className="metric-lbl">Dipanggil/Dilayani</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-num">{completedCount}</span>
                      <span className="metric-lbl">Selesai</span>
                    </div>
                  </div>

                  <div className="doctor-schedule-list">
                    <small className="schedule-title">Jadwal Praktik:</small>
                    {doc.jadwalPraktik && doc.jadwalPraktik.length > 0 ? (
                      <div className="schedule-chips">
                        {doc.jadwalPraktik.map((j) => (
                          <span key={j.id} className="schedule-chip">
                            {HARI_LABEL[j.hari] || j.hari}:{" "}
                            {formatJamSlot(j.jamMulai)}–
                            {formatJamSlot(j.jamSelesai)} (Kuota{" "}
                            {j.kuotaAntrean})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="no-schedule">Belum ada jadwal</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- TABEL ANTREAN --- */}
        <div className="petugas-action">
          <div
            className="petugas-action-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h2>Daftar Antrean</h2>
              <p>Kelola antrian pasien untuk klinik Anda.</p>
            </div>
            <button
              type="button"
              className="btn-panggil"
              onClick={() => setShowWalkIn((v) => !v)}
            >
              {showWalkIn ? "Batal" : "+ Tambah Walk-in"}
            </button>
          </div>

          {showWalkIn && (
            <form className="walk-in-form" onSubmit={submitWalkIn}>
              <h3>Daftarkan pasien walk-in</h3>
              <div className="walk-in-fields">
                <label>
                  Dokter
                  <select
                    name="doctorId"
                    required
                    value={walkInDoctorId}
                    onChange={(e) => setWalkInDoctorId(e.target.value)}
                  >
                    <option value="" disabled>
                      Pilih dokter
                    </option>
                    {safeDoctors
                      .filter((d) => d.isActive)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nama} · {d.spesialisasi}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Jadwal ({HARI_LABEL[todayHari] || todayHari}, hari ini)
                  <select
                    name="jadwalId"
                    required
                    disabled={!walkInDoctorId}
                    defaultValue=""
                    key={walkInDoctorId}
                  >
                    <option value="" disabled>
                      {walkInDoctorId
                        ? todaySchedules.length
                          ? "Pilih jadwal"
                          : "Tidak ada jadwal hari ini"
                        : "Pilih dokter dahulu"}
                    </option>
                    {todaySchedules.map((j) => (
                      <option key={j.id} value={j.id}>
                        {formatJamSlot(j.jamMulai)}–
                        {formatJamSlot(j.jamSelesai)} (Kuota {j.kuotaAntrean})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nama pasien
                  <input
                    name="namaPasien"
                    placeholder="Nama lengkap"
                    required
                  />
                </label>
                <label>
                  Tanggal lahir
                  <input name="birthDate" type="date" required />
                </label>
                <label>
                  Jenis kelamin
                  <select name="gender" required defaultValue="">
                    <option value="" disabled>
                      Pilih jenis kelamin
                    </option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </label>
                <label>
                  Tempat lahir (opsional)
                  <input name="birthPlace" placeholder="Kota kelahiran" />
                </label>
              </div>
              <button type="submit" className="btn-panggil">
                Daftarkan antrean
              </button>
            </form>
          )}

          <div
            className="petugas-filters"
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            <input
              type="text"
              placeholder="Cari nama pasien..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              style={{ flex: 1, minWidth: "200px" }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="MENUNGGU">Menunggu</option>
              <option value="SEDANG_DIPANGGIL">Sedang Dipanggil</option>
              <option value="SEDANG_DILAYANI">Sedang Dilayani</option>
              <option value="SELESAI">Selesai</option>
              <option value="DILEWATI">Dilewati</option>
              <option value="DIBATALKAN">Dibatalkan</option>
            </select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="queue-table">
              <thead>
                <tr>
                  <th>No Antrean</th>
                  <th>Nama Pasien</th>
                  <th>Dokter</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueues.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#6b7280",
                      }}
                    >
                      Tidak ada antrean yang sesuai.
                    </td>
                  </tr>
                ) : paginatedQueues.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <strong>{q.nomorAntrean}</strong>
                    </td>
                    <td>{q.recordPasien?.nama || "-"}</td>
                    <td>{q.doctor?.nama || "-"}</td>
                    <td>
                      <span className={`status-badge status-${q.status}`}>
                        {q.status ? q.status.replace(/_/g, " ") : "-"}
                      </span>
                    </td>
                    <td>
                      <div className="queue-actions">
                        {q.status === "MENUNGGU" && (
                          <>
                            <button
                              className="btn-panggil"
                              onClick={() =>
                                updateStatus(q.id, "SEDANG_DIPANGGIL")
                              }
                            >
                              Panggil
                            </button>
                            <button
                              className="btn-lewati"
                              onClick={() => updateStatus(q.id, "DILEWATI")}
                            >
                              Lewati
                            </button>
                          </>
                        )}
                        {q.status === "SEDANG_DIPANGGIL" && (
                          <>
                            <button
                              className="btn-panggil"
                              onClick={() =>
                                updateStatus(q.id, "SEDANG_DILAYANI")
                              }
                            >
                              Mulai Dilayani
                            </button>
                            <button
                              className="btn-lewati"
                              onClick={() => updateStatus(q.id, "DILEWATI")}
                            >
                              Lewati
                            </button>
                          </>
                        )}
                        {q.status === "SEDANG_DILAYANI" && (
                          <button
                            className="btn-selesai"
                            onClick={() => updateStatus(q.id, "SELESAI")}
                          >
                            Selesai
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              className="pagination"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "16px",
                marginTop: "24px",
              }}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: currentPage === 1 ? "#f9fafb" : "#fff",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                Sebelumnya
              </button>
              <span
                style={{
                  fontSize: "14px",
                  color: "#4b5563",
                  fontWeight: "500",
                }}
              >
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: currentPage === totalPages ? "#f9fafb" : "#fff",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}