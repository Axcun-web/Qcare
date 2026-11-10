import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { formatQueueNumber } from "../../lib/queueNumber";
import {
  QUEUE_REFRESH_MS,
  formatCallTime,
  formatVisitDate,
  greeting,
} from "../../lib/visitDates";
import PatientNavbar from "../../components/PatientNavbar";
import "./PatientDashboard.css";

const PatientDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Set by the booking form after a successful booking (Tabel 3.8 step 2).
  // Kept in component state and cleared from history right away, so a
  // reload does not show the confirmation again.
  const [justBooked] = useState(location.state?.justBooked === true);
  useEffect(() => {
    if (location.state?.justBooked)
      navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);
  const [dashboardData, setDashboardData] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // silent: background refresh, keep the current view instead of "loading".
  const fetchDashboard = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await api("/queues/dashboard");
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch patient dashboard data:", err);
      if (!silent) setError("Gagal memuat data antrean. Silakan coba lagi.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Auto-refresh while a queue runs today (Tabel 3.9 step 5).
  const hasLiveQueue = Boolean(
    dashboardData?.activeQueue && !dashboardData.activeQueue.isFutureVisit,
  );
  useEffect(() => {
    if (!hasLiveQueue) return undefined;
    const interval = setInterval(
      () => fetchDashboard({ silent: true }),
      QUEUE_REFRESH_MS,
    );
    return () => clearInterval(interval);
  }, [hasLiveQueue]);

  useEffect(() => {
    fetchDashboard();
    // Gbr 3.72: clinic information (jam operasional, jenis layanan).
    api("/clinics")
      .then((res) => setClinics(res.data || []))
      .catch((err) => console.error("Failed to fetch clinics:", err));
  }, []);

  const formatStatus = (status) => {
    switch (status) {
      case "SELESAI":
        return "Selesai";
      case "DILEWATI":
        return "Dilewati";
      case "DIBATALKAN":
        return "Dibatalkan";
      default:
        return status;
    }
  };

  const handleCancelQueue = async () => {
    if (!dashboardData?.activeQueue) return;

    const confirmCancel = window.confirm(
      "Apakah Anda yakin ingin membatalkan antrean ini?",
    );
    if (!confirmCancel) return;

    try {
      await api(`/queues/${dashboardData.activeQueue.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DIBATALKAN" }),
      });
      // Refresh
      window.location.reload();
    } catch (err) {
      console.error("Failed to cancel queue:", err);
      alert("Gagal membatalkan antrean.");
    }
  };

  return (
    <div className="dashboard-page">
      <PatientNavbar />

      <main className="dashboard-main">
        <section className="greeting-section">
          <div>
            <h1>
              {greeting()}, {dashboardData?.user?.nama || "Pasien"}
            </h1>
            <p>Berikut adalah status antrean Anda saat ini.</p>
          </div>
          <button
            className="new-queue-btn"
            onClick={() => navigate("/patient-data")}
          >
            <span className="plus-icon">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </span>
            Ambil Antrean Baru
          </button>
        </section>

        {justBooked && dashboardData?.activeQueue && (
          <div className="booking-confirmation" role="status">
            Nomor antrean berhasil diambil. Simpan nomor antrean Anda dan datang
            sesuai tanggal kunjungan.
          </div>
        )}

        {loading ? (
          <div className="loading-state">Memuat data dashboard...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : (
          <section className="dashboard-grid">
            {/* QUEUE CARD */}
            <div
              className={`card queue-card ${!dashboardData?.activeQueue ? "empty-state" : ""}`}
            >
              {dashboardData?.activeQueue ? (
                <>
                  <div className="queue-header">
                    <span className="clinic-badge">
                      🏥 {dashboardData.activeQueue.clinicNama}
                    </span>
                    <div className="queue-number-block">
                      <span className="queue-label">NOMOR ANTREAN</span>
                      <span className="queue-number">
                        {formatQueueNumber(
                          dashboardData.activeQueue.doctorId,
                          dashboardData.activeQueue.nomorAntrean,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="doctor-info">
                    <h2>{dashboardData.activeQueue.doctorNama}</h2>
                    <p>{dashboardData.activeQueue.doctorSpesialisasi}</p>
                    <p className="visit-date">
                      Kunjungan:{" "}
                      {formatVisitDate(dashboardData.activeQueue.tanggal)}
                    </p>
                  </div>
                  <div className="queue-stats">
                    <div className="stat-item">
                      <span className="stat-label">
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Estimasi Waktu Tunggu
                      </span>
                      <span className="stat-value">
                        {dashboardData.activeQueue.isFutureVisit
                          ? "Tersedia pada hari kunjungan"
                          : `~${dashboardData.activeQueue.estimatedWaitTime} Menit`}
                      </span>
                      {!dashboardData.activeQueue.isFutureVisit &&
                        dashboardData.activeQueue.estimatedCallTime && (
                          <span className="stat-sub">
                            Perkiraan dipanggil{" "}
                            {formatCallTime(
                              dashboardData.activeQueue.estimatedCallTime,
                            )}
                          </span>
                        )}
                    </div>
                    <div className="stat-item text-right">
                      <span className="stat-label">Antrean Saat Ini</span>
                      <span className="stat-value">
                        {dashboardData.activeQueue.currentQueueNumber !== "-"
                          ? formatQueueNumber(
                              dashboardData.activeQueue.doctorId,
                              dashboardData.activeQueue.currentQueueNumber,
                            )
                          : "Belum Dimulai"}
                      </span>
                    </div>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${dashboardData.activeQueue.isFutureVisit ? 0 : Math.max(10, 100 - dashboardData.activeQueue.peopleAhead * 20)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {dashboardData.activeQueue.isFutureVisit
                        ? "Antrean dimulai pada hari kunjungan"
                        : dashboardData.activeQueue.peopleAhead > 0
                          ? `${dashboardData.activeQueue.peopleAhead} orang di depan Anda`
                          : "Giliran Anda berikutnya!"}
                    </span>
                  </div>
                  {/* Patients may cancel only while still waiting. */}
                  {dashboardData.activeQueue.status === "MENUNGGU" && (
                    <div style={{ marginTop: "16px" }}>
                      <button
                        onClick={handleCancelQueue}
                        className="btn-cancel-queue"
                      >
                        Batalkan Antrean
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-queue-block">
                  <div className="no-queue-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="32"
                      height="32"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="1.5"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <h3>Belum Ada Antrean</h3>
                  <p>
                    Anda belum terdaftar dalam jadwal antrean klinik mana pun
                    hari ini.
                  </p>
                  <button
                    className="new-queue-btn"
                    onClick={() => navigate("/patient-data")}
                  >
                    Daftar Antrean
                  </button>
                </div>
              )}
            </div>

            {/* CLINIC INFO CARD (Gbr 3.72) */}
            <div className="card clinic-info-card">
              {dashboardData?.activeQueue ? (
                <>
                  <span className="clinic-info-label">INFORMASI KLINIK</span>
                  <h3>{dashboardData.activeQueue.clinicNama}</h3>
                  {dashboardData.activeQueue.clinicAlamat && (
                    <p>{dashboardData.activeQueue.clinicAlamat}</p>
                  )}
                  <dl>
                    <dt>Jam operasional</dt>
                    <dd>
                      {dashboardData.activeQueue.clinicJamOperasional || "-"}
                    </dd>
                    <dt>Jenis layanan</dt>
                    <dd>
                      {dashboardData.activeQueue.clinicJenisLayanan || "-"}
                    </dd>
                    {dashboardData.activeQueue.clinicNoTelp && (
                      <>
                        <dt>Telepon</dt>
                        <dd>{dashboardData.activeQueue.clinicNoTelp}</dd>
                      </>
                    )}
                  </dl>
                </>
              ) : (
                <>
                  <span className="clinic-info-label">PILIH KLINIK</span>
                  <h3>{clinics.length} klinik tersedia</h3>
                  <p>
                    Lihat jam operasional, jenis layanan, dan jadwal dokter
                    sebelum mengambil nomor antrean.
                  </p>
                  <button
                    className="info-btn"
                    onClick={() => navigate("/clinics")}
                  >
                    Lihat Klinik
                  </button>
                </>
              )}
            </div>

            {/* HISTORY CARD */}
            <div className="card history-card">
              <h3 className="card-title">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 3v5h5"></path>
                  <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path>
                  <path d="M12 7v5l4 2"></path>
                </svg>
                Riwayat Terakhir
              </h3>
              <ul className="history-list">
                {dashboardData?.history?.length > 0 ? (
                  dashboardData.history.map((item) => (
                    <li className="history-item" key={item.id}>
                      <div>
                        <strong>{item.clinicNama}</strong>
                        <span>
                          {new Date(item.tanggal).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <span className={`status-badge status-${item.status}`}>
                        {formatStatus(item.status)}
                      </span>
                    </li>
                  ))
                ) : (
                  <p className="empty-text">Belum ada riwayat antrean.</p>
                )}
              </ul>
            </div>

            {/* CLINIC LIST (Gbr 3.72: informasi klinik) */}
            <div className="card clinic-list-card">
              <h3 className="card-title">Klinik Tersedia</h3>
              {clinics.length > 0 ? (
                <ul className="clinic-list">
                  {clinics.map((clinic) => (
                    <li key={clinic.id}>
                      <div>
                        <strong>{clinic.nama}</strong>
                        <span>{clinic.alamat}</span>
                      </div>
                      <div className="clinic-list-meta">
                        <span>🕒 {clinic.jamOperasional || "-"}</span>
                        <span>{clinic.jenisLayanan || "-"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-text">Belum ada klinik.</p>
              )}
              <Link to="/clinics" className="clinic-list-link">
                Lihat jadwal dokter →
              </Link>
            </div>
          </section>
        )}
      </main>

      <footer className="dashboard-footer">
        <div className="footer-links">
          <strong>QCare</strong>
        </div>
        <div className="footer-copyright">
          © 2026 Manajemen Klinik QCare. Modernisme Klinis untuk Kesehatan.
        </div>
      </footer>
    </div>
  );
};

export default PatientDashboard;
