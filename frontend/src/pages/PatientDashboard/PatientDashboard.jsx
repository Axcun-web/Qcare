import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import PatientNavbar from "../../components/PatientNavbar";
import "./PatientDashboard.css";

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await api("/queues/dashboard");
        if (response.success) {
          setDashboardData(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch patient dashboard data:", err);
        setError("Gagal memuat data antrean. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatStatus = (status) => {
    switch (status) {
      case "SELESAI": return "Selesai";
      case "DILEWATI": return "Dilewati";
      case "DIBATALKAN": return "Dibatalkan";
      default: return status;
    }
  };

  const handleCancelQueue = async () => {
    if (!dashboardData?.activeQueue) return;
    
    const confirmCancel = window.confirm("Apakah Anda yakin ingin membatalkan antrean ini?");
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
            <h1>Selamat Pagi, {dashboardData?.user?.nama || "Pasien"}</h1>
            <p>Berikut adalah status antrean Anda saat ini.</p>
          </div>
          <button className="new-queue-btn" onClick={() => navigate("/patient-data")}>
            <span className="plus-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            </span> 
            Ambil Antrean Baru
          </button>
        </section>

        {loading ? (
          <div className="loading-state">Memuat data dashboard...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : (
          <section className="dashboard-grid">
            {/* QUEUE CARD */}
            <div className={`card queue-card ${!dashboardData?.activeQueue ? 'empty-state' : ''}`}>
              {dashboardData?.activeQueue ? (
                <>
                  <div className="queue-header">
                    <span className="clinic-badge">🏥 {dashboardData.activeQueue.clinicNama}</span>
                    <div className="queue-number-block">
                      <span className="queue-label">NOMOR ANTREAN</span>
                      <span className="queue-number">A-{dashboardData.activeQueue.nomorAntrean}</span>
                    </div>
                  </div>
                  <div className="doctor-info">
                    <h2>{dashboardData.activeQueue.doctorNama}</h2>
                    <p>{dashboardData.activeQueue.doctorSpesialisasi}</p>
                  </div>
                  <div className="queue-stats">
                    <div className="stat-item">
                      <span className="stat-label">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Estimasi Waktu Tunggu
                      </span>
                      <span className="stat-value">~{dashboardData.activeQueue.estimatedWaitTime} Menit</span>
                    </div>
                    <div className="stat-item text-right">
                      <span className="stat-label">Antrean Saat Ini</span>
                      <span className="stat-value">
                        {dashboardData.activeQueue.currentQueueNumber !== "-" 
                          ? `A-${dashboardData.activeQueue.currentQueueNumber}` 
                          : "Belum Dimulai"}
                      </span>
                    </div>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.max(10, 100 - (dashboardData.activeQueue.peopleAhead * 20))}%` }}></div>
                    </div>
                    <span className="progress-text">
                      {dashboardData.activeQueue.peopleAhead > 0 
                        ? `${dashboardData.activeQueue.peopleAhead} orang di depan Anda` 
                        : "Giliran Anda berikutnya!"}
                    </span>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <button 
                      onClick={handleCancelQueue} 
                      className="btn-cancel-queue"
                    >
                      Batalkan Antrean
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-queue-block">
                  <div className="no-queue-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <h3>Belum Ada Antrean</h3>
                  <p>Anda belum terdaftar dalam jadwal antrean klinik mana pun hari ini.</p>
                  <button className="new-queue-btn" onClick={() => navigate("/patient-data")}>
                    Daftar Antrean
                  </button>
                </div>
              )}
            </div>

            {/* PROMO CARD */}
            <div className="card promo-card">
              <h3>Vaksinasi Flu Tersedia</h3>
              <p>Lindungi diri Anda musim ini. Daftar sekarang tanpa antre panjang.</p>
              <button className="info-btn">Info Lanjut</button>
            </div>

            {/* HISTORY CARD */}
            <div className="card history-card">
              <h3 className="card-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><path d="M12 7v5l4 2"></path></svg>
                Riwayat Terakhir
              </h3>
              <ul className="history-list">
                {dashboardData?.history?.length > 0 ? (
                  dashboardData.history.map((item) => (
                    <li className="history-item" key={item.id}>
                      <div>
                        <strong>{item.clinicNama}</strong>
                        <span>{new Date(item.tanggal).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
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

            {/* HEALTH REMINDER CARD */}
            <div className="card health-card">
              <div className="health-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#26734d" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="9" y1="12" x2="15" y2="12"></line><line x1="12" y1="9" x2="12" y2="15"></line></svg>
              </div>
              <h3>Jaga Kesehatan</h3>
              <p>Jangan lupa minum air putih dan istirahat yang cukup hari ini.</p>
            </div>

            {/* MAP CARD */}
            <div className="card map-card">
              <h3 className="card-title">Klinik Terdekat</h3>
              <div className="map-placeholder">
                <div style={{ width: '100%', height: '150px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                  Peta Klinik Terdekat
                </div>
              </div>
              <p>3 klinik berjarak kurang dari 5km dari lokasi Anda.</p>
            </div>
          </section>
        )}
      </main>

      <footer className="dashboard-footer">
        <div className="footer-links">
          <strong>QCare</strong>
          <Link to="#">Kebijakan Privasi</Link>
          <Link to="#">Syarat dan Ketentuan</Link>
          <Link to="#">Hubungi Bantuan</Link>
          <Link to="#">Info Darurat</Link>
        </div>
        <div className="footer-copyright">© 2026 Manajemen Klinik QCare. Modernisme Klinis untuk Kesehatan.</div>
      </footer>
    </div>
  );
};

export default PatientDashboard;