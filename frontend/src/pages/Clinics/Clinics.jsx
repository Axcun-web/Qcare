import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import PatientNavbar from "../../components/PatientNavbar";
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
      <PatientNavbar />

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
                  {clinic.noTelp && (
                    <p className="contact" style={{ margin: "4px 0", color: "#6b7280", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {clinic.noTelp}
                    </p>
                  )}
                  <span className="hours">⏱ {clinic.jamOperasional}</span>
                </div>
                
                <div className="doctor-section">
                  <h3 style={{ display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                      <circle cx="20" cy="10" r="2" />
                    </svg>
                    Tim Dokter & Jadwal
                  </h3>
                  {clinic.doctors && clinic.doctors.length > 0 ? (
                    <div className="doctor-list-modern">
                      {clinic.doctors.map((doc) => (
                        <div key={doc.id} className="doctor-item">
                          <div className="doctor-header">
                            <strong>{doc.nama}</strong>
                            <span className="specialty-badge">{doc.spesialisasi}</span>
                          </div>
                          <div className="doctor-schedules">
                            {doc.jadwalPraktik && doc.jadwalPraktik.length > 0 ? (
                              doc.jadwalPraktik.map(j => (
                                <div key={j.id} className="schedule-badge">
                                  {j.hari.charAt(0).toUpperCase() + j.hari.slice(1).toLowerCase()}: {new Date(j.jamMulai).toLocaleTimeString('id-ID', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit' })} - {new Date(j.jamSelesai).toLocaleTimeString('id-ID', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit' })}
                                </div>
                              ))
                            ) : (
                              <span className="no-schedule">Belum ada jadwal</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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