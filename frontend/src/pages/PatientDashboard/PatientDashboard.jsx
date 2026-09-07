import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PatientDashboard.css";

const PatientDashboard = () => {
  const navigate = useNavigate();
  // Tambahkan state untuk mengontrol dropdown profil
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div className="dashboard-page">
      {/* HEADER */}
      <header className="dashboard-header">
        <Link to="/patient" className="logo">
          QCare
        </Link>
        
        <nav className="header-nav">
          <Link to="/patient" className="nav-link active">
            Dashboard
          </Link>
          <Link to="/clinics" className="nav-link">
            Klinik
          </Link>
          <Link to="/appointments" className="nav-link">
            Janji Temu
          </Link>
          <Link to="/history" className="nav-link">
            Riwayat
          </Link>
        </nav>

        <div className="header-right">
          {/* PROFILE WRAPPER */}
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

            {/* PROFILE DROPDOWN */}
            {showProfileMenu && (
              <div className="profile-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/settings");
                  }}
                >
                  <span className="dropdown-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </span>
                  Settings
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    alert("Notifications");
                  }}
                >
                  <span className="dropdown-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </span>
                  Notifications
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        {/* GREETING SECTION */}
        <section className="greeting-section">
          <div>
            <h1>Selamat Pagi, Pasien</h1>
            <p>Berikut adalah status antrean Anda saat ini.</p>
          </div>
          <button className="new-queue-btn" onClick={() => navigate("/patient-data")}>
            <span className="plus-icon">⊕</span> Ambil Antrean Baru
          </button>
        </section>

        {/* GRID DASHBOARD */}
        <section className="dashboard-grid">
          
          {/* QUEUE CARD */}
          <div className="card queue-card">
            <div className="queue-header">
              <span className="clinic-badge">🏥 Klinik Utama Sehat</span>
              <div className="queue-number-block">
                <span className="queue-label">NOMOR ANTREAN</span>
                <span className="queue-number">A-12</span>
              </div>
            </div>
            
            <div className="doctor-info">
              <h2>Dr. Jane Doe</h2>
              <p>Umum</p>
            </div>

            <div className="queue-stats">
              <div className="stat-item">
                <span className="stat-label">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg> 
                  Estimasi Waktu Tunggu
                </span>
                <span className="stat-value">~15 Menit</span>
              </div>
              <div className="stat-item text-right">
                <span className="stat-label">Antrean Saat Ini</span>
                <span className="stat-value">A-08</span>
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "60%" }}></div>
              </div>
              <span className="progress-text">4 orang di depan Anda</span>
            </div>
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
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v5h5"></path>
                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path>
                <path d="M12 7v5l4 2"></path>
              </svg>
              Riwayat Terakhir
            </h3>
            <ul className="history-list">
              <li className="history-item">
                <div>
                  <strong>Klinik Gigi Berseri</strong>
                  <span>12 Okt 2023</span>
                </div>
                <span className="status-badge">Selesai</span>
              </li>
              <li className="history-item">
                <div>
                  <strong>RS Medika Center</strong>
                  <span>05 Sep 2023</span>
                </div>
                <span className="status-badge">Selesai</span>
              </li>
            </ul>
          </div>

          {/* HEALTH REMINDER CARD */}
          <div className="card health-card">
            <div className="health-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#26734d" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <line x1="9" y1="12" x2="15" y2="12"></line>
                <line x1="12" y1="9" x2="12" y2="15"></line>
              </svg>
            </div>
            <h3>Jaga Kesehatan</h3>
            <p>Jangan lupa minum air putih dan istirahat yang cukup hari ini.</p>
          </div>

          {/* MAP CARD */}
          <div className="card map-card">
            <h3 className="card-title">Klinik Terdekat</h3>
            <div className="map-placeholder">
              <img src="https://via.placeholder.com/300x150?text=Peta+Klinik+Terdekat" alt="Peta" />
            </div>
            <p>3 klinik berjarak kurang dari 5km dari lokasi Anda.</p>
          </div>

        </section>
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

export default PatientDashboard;