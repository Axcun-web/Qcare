import React from "react";
import { useNavigate } from "react-router-dom";
import "./AboutUs.css";

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <div className="about-us-page">
      <div className="about-us-card">
        {/* TOPBAR WITH BACK BUTTON */}
        <div className="about-us-topbar">
          <button 
            className="back-button" 
            onClick={() => navigate("/settings")}
            aria-label="Kembali ke Settings"
          >
            <span className="back-arrow">←</span>
          </button>
        </div>

        {/* HEADER & LOGO */}
        <div className="about-us-header">
          <h1 className="qcare-logo">QCare</h1>
          <p className="qcare-subtitle">Sistem Antrean Layanan Kesehatan</p>
          <span className="version-badge">Versi 1.0.0</span>
        </div>

        {/* CONTENT */}
        <div className="about-us-content">
          <section className="about-section">
            <h2>Tentang Aplikasi</h2>
            <p>
              QCare adalah platform manajemen antrean digital yang dirancang untuk mempermudah pasien dalam mendaftar, memantau antrean secara real-time, dan mengelola data layanan kesehatan secara terintegrasi.
            </p>
          </section>

          <section className="about-section">
            <h2>Layanan & Fitur</h2>
            <ul className="feature-list">
              <li><span>✓</span> Pendaftaran antrean cepat dan praktis</li>
              <li><span>✓</span> Pemantauan status antrean real-time</li>
              <li><span>✓</span> Pengelolaan profil pasien terpusat</li>
            </ul>
          </section>
        </div>

        {/* FOOTER */}
        <div className="about-us-footer">
          <p>© {new Date().getFullYear()} QCare.</p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;