import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import "./Appointments.css";

const Appointments = () => {
  const navigate = useNavigate();

  const [activeQueue, setActiveQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    fetchActiveQueue();
  }, []);

  const fetchActiveQueue = async () => {
    try {
      setLoading(true);
      // Fetch all patient queues
      const response = await api("/queues/mine");
      if (response.success) {
        const allQueues = response.data || [];
        
        // Find the first active queue (MENUNGGU, SEDANG_DIPANGGIL, SEDANG_DILAYANI)
        const active = allQueues.find((q) =>
          ["MENUNGGU", "SEDANG_DIPANGGIL", "SEDANG_DILAYANI"].includes(q.status)
        );

        // Calculate dummy wait time and people ahead for visual purposes
        // (In a full production app, the backend would provide exact metrics here)
        if (active) {
          const simulatedPeopleAhead = Math.max(0, active.nomorAntrean - 1);
          active.peopleAhead = simulatedPeopleAhead;
          active.estimatedWaitTime = simulatedPeopleAhead > 0 ? simulatedPeopleAhead * 15 : 0;
          active.currentServing = active.nomorAntrean > 1 ? `A-${active.nomorAntrean - simulatedPeopleAhead}` : "-";
        }

        setActiveQueue(active || null);
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
      setError("Gagal memuat data janji temu.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelQueue = async () => {
    if (!activeQueue) return;
    
    const confirmCancel = window.confirm("Apakah Anda yakin ingin membatalkan antrean ini?");
    if (!confirmCancel) return;

    try {
      // Assuming your backend route for patients allows them to cancel their own queue
      // Note: You may need to ensure the backend allows PASIEN to use this PATCH route
      await api(`/queues/${activeQueue.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DIBATALKAN" }),
      });
      
      // Refresh state
      setActiveQueue(null);
    } catch (err) {
      console.error("Failed to cancel queue:", err);
      alert("Gagal membatalkan antrean.");
    }
  };

  const handleTakeQueue = () => {
    navigate("/patient-data");
  };

  return (
    <div className="dashboard-page">
      {/* HEADER */}
      <header className="dashboard-header">
        <Link to="/patient" className="logo">QCare</Link>

        <nav className="header-nav">
          <Link to="/patient" className="nav-link">Dashboard</Link>
          <Link to="/clinics" className="nav-link">Klinik</Link>
          <Link to="/appointments" className="nav-link active">Janji Temu</Link>
          <Link to="/history" className="nav-link">Riwayat</Link>
        </nav>

        <div className="header-right">
          <div className="profile-wrapper">
            <div
              className="profile-pic"
              onClick={() => setShowProfileMenu((prev) => !prev)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <button type="button" onClick={() => { setShowProfileMenu(false); navigate("/settings"); }}>
                  <span className="dropdown-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  </span>
                  Pengaturan
                </button>
                <button type="button" onClick={() => { setShowProfileMenu(false); alert("Notifikasi"); }}>
                  <span className="dropdown-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  </span>
                  Notifikasi
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        <section className="appointments-title-section">
          <div>
            <h1>Janji Temu</h1>
            <p>Lihat status nomor antrean Anda.</p>
          </div>
        </section>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Memuat antrean...</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>{error}</div>
        ) : activeQueue ? (
          <section className="appointment-layout">
            <div className="queue-card">
              <div className="queue-card-content">
                <div className="clinic-badge">+ {activeQueue.clinic?.nama || "Klinik"}</div>
                <div className="queue-top">
                  <div className="doctor-information">
                    <h2>{activeQueue.doctor?.nama || "Dokter"}</h2>
                    <p>{activeQueue.doctor?.spesialisasi || "Umum"}</p>
                  </div>
                  <div className="queue-number">
                    <span>NOMOR ANTREAN</span>
                    <strong>A-{activeQueue.nomorAntrean}</strong>
                  </div>
                </div>

                <div className="waiting-information">
                  <div className="waiting-left">
                    <div className="clock-icon"><span></span></div>
                    <div>
                      <p>Estimasi Waktu Tunggu</p>
                      <strong>~{activeQueue.estimatedWaitTime} Menit</strong>
                    </div>
                  </div>
                  <div className="current-queue">
                    <p>Antrean Saat Ini</p>
                    <strong>{activeQueue.currentServing}</strong>
                  </div>
                </div>

                <div className="queue-progress-container">
                  <div className="queue-progress">
                    <div 
                      className="queue-progress-fill" 
                      style={{ width: `${Math.max(10, 100 - (activeQueue.peopleAhead * 20))}%` }}
                    ></div>
                  </div>
                  <p>
                    {activeQueue.peopleAhead > 0 
                      ? `${activeQueue.peopleAhead} orang di depan Anda` 
                      : "Giliran Anda berikutnya!"}
                  </p>
                </div>

                <div className="queue-status">
                  <span className="status-dot"></span>
                  {activeQueue.status === "SEDANG_DIPANGGIL" ? "Menuju Ruang Dokter" : 
                   activeQueue.status === "SEDANG_DILAYANI" ? "Sedang Dilayani" : "Anda sedang dalam antrean"}
                </div>

                <button className="cancel-queue-button" onClick={handleCancelQueue}>
                  Batalkan Nomor Antrean
                </button>
              </div>
            </div>

            <aside className="appointment-sidebar">
              <div className="clinic-info-box">
                <div className="info-circle">i</div>
                <div>
                  <h3>Tetap di area klinik</h3>
                  <p>Pastikan Anda berada di sekitar klinik agar tidak melewatkan giliran.</p>
                </div>
              </div>

              <div className="clinic-detail-card">
                <h3>Detail Klinik</h3>
                <h4>{activeQueue.clinic?.nama || "Klinik"}</h4>
                <p>Layanan: {activeQueue.doctor?.spesialisasi || "Umum"}</p>
                <button className="clinic-detail-button" type="button">
                  Lihat Detail Klinik
                </button>
              </div>
            </aside>
          </section>
        ) : (
          <section className="no-queue-section">
            <div className="no-queue-card">
              <div className="no-queue-icon">+</div>
              <h2>Tidak Memiliki Nomor Antrean</h2>
              <p>Anda saat ini belum memiliki nomor antrean aktif.</p>
              <button className="take-queue-button" onClick={handleTakeQueue}>
                Ambil Nomor Antrean
              </button>
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <div className="footer-links">
          <strong>QCare</strong>
          <Link to="#">Kebijakan Privasi</Link>
          <Link to="#">Syarat dan Ketentuan</Link>
          <Link to="#">Hubungi Bantuan</Link>
          <Link to="#">Info Darurat</Link>
        </div>
        <div className="footer-copyright">
          © 2026 Manajemen Klinik QCare. Modernisme Klinis untuk Kesehatan.
        </div>
      </footer>
    </div>
  );
};

export default Appointments;