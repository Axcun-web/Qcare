import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "./Clinics.css";

export default function Clinics() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    api("/clinics") 
      .then((res) => {
        setClinics(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="directory-message">Memuat data klinik...</div>;
  if (error) return <div className="directory-message error">Gagal memuat: {error}</div>;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Link to="/patient" className="logo">
          QCare
        </Link>
        
        <nav className="header-nav">
          <Link to="/patient" className="nav-link">
            Dashboard
          </Link>
          <Link to="/clinics" className="nav-link active">
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

      <main className="dashboard-main">
        <header className="directory-header">
          <h1 style={{ margin: 0, fontSize: '28px', color: '#111827' }}>Daftar Klinik & Layanan</h1>
          <p style={{ margin: '8px 0 30px 0', color: '#6b7280', fontSize: '15px' }}>
            Temukan klinik dan jadwal dokter untuk layanan antrean Anda.
          </p>
        </header>
        
        <div className="directory-grid">
          {clinics.length === 0 ? (
            <p>Belum ada klinik yang tersedia.</p>
          ) : (
            clinics.map((clinic) => (
              <article key={clinic.id} className="clinic-card">
                <div className="clinic-info">
                  <small className="badge">{clinic.jenisLayanan}</small>
                  <h2>{clinic.nama}</h2>
                  <p className="address">{clinic.alamat}</p>
                  <span className="hours">◷ {clinic.jamOperasional}</span>
                </div>
                
                <div className="doctor-section">
                  <h3>Tim Dokter</h3>
                  {clinic.doctors && clinic.doctors.length > 0 ? (
                    <ul className="doctor-list">
                      {clinic.doctors.map((doc) => (
                        <li key={doc.id}>
                          <strong>{doc.nama}</strong>
                          <span>{doc.spesialisasi}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-doctors">Belum ada dokter yang ditugaskan.</p>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </main>

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
}