import React from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const Settings = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/Login");
  };

  return (
    <div className="settings-page">

      {/* ================= HEADER ================= */}
      <header className="settings-header">

        <div className="settings-logo">
          QCare
        </div>

        {/* Profile */}
        <div className="settings-profile">
          <svg
            viewBox="0 0 48 48"
            className="profile-svg"
          >
            <circle
              cx="24"
              cy="16"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />

            <path
              d="M11 39c0-7.2 5.8-13 13-13s13 5.8 13 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

      </header>


      {/* ================= MAIN ================= */}
      <main className="settings-main">

        {/* ================= BACK BUTTON ================= */}
        <button
          type="button"
          className="settings-back"
          onClick={() => navigate("/dashboard")}
          aria-label="Kembali ke Dashboard"
        >
          <span className="back-arrow">
            ←
          </span>
        </button>


        {/* ================= TITLE ================= */}
        <h1 className="settings-title">
          Settings
        </h1>


        {/* ================= AKUN ================= */}
        <section className="settings-section">

          <h2 className="settings-section-title">
            Akun
          </h2>

          <div className="settings-card">

            {/* UBAH NAMA */}
            <button
              type="button"
              className="settings-item"
            >
              <div className="settings-item-left">

                <svg
                  viewBox="0 0 48 48"
                  className="item-icon"
                >
                  <circle
                    cx="24"
                    cy="15"
                    r="7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />

                  <path
                    d="M12 38c0-6.6 5.4-12 12-12s12 5.4 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>

                <span>
                  Ubah Nama
                </span>

              </div>

              <span className="item-arrow">
                ›
              </span>
            </button>


            {/* UBAH PASSWORD */}
            <button
              type="button"
              className="settings-item"
            >
              <div className="settings-item-left">

                <svg
                  viewBox="0 0 48 48"
                  className="item-icon"
                >
                  <rect
                    x="12"
                    y="21"
                    width="24"
                    height="18"
                    rx="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />

                  <path
                    d="M17 21v-5a7 7 0 0 1 14 0v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  <circle
                    cx="24"
                    cy="30"
                    r="2"
                    fill="currentColor"
                  />
                </svg>

                <span>
                  Ubah Password
                </span>

              </div>

              <span className="item-arrow">
                ›
              </span>
            </button>


            {/* KELUAR */}
            <button
              type="button"
              className="settings-item logout-item"
              onClick={handleLogout}
            >
              <div className="settings-item-left">

                <svg
                  viewBox="0 0 48 48"
                  className="item-icon"
                >
                  {/* Pintu */}
                  <path
                    d="M10 8v32h16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Panah keluar */}
                  <path
                    d="M23 24h15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  <path
                    d="M32 17l7 7-7 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span>
                  Keluar
                </span>

              </div>

              <span className="item-arrow">
                ›
              </span>
            </button>

          </div>

        </section>


        {/* ================= TENTANG ================= */}
        <section className="settings-section about-section">

          <h2 className="settings-section-title">
            Tentang
          </h2>

          <div className="settings-card">

            {/* TENTANG APLIKASI */}
            <button
              type="button"
              className="settings-item"
            >
              <div className="settings-item-left">

                <svg
                  viewBox="0 0 48 48"
                  className="item-icon"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />

                  <line
                    x1="24"
                    y1="21"
                    x2="24"
                    y2="33"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  <circle
                    cx="24"
                    cy="15"
                    r="1.8"
                    fill="currentColor"
                  />
                </svg>

                <span>
                  Tentang Aplikasi
                </span>

              </div>

              <span className="item-arrow">
                ›
              </span>
            </button>


            {/* FEEDBACK */}
            <button
              type="button"
              className="settings-item"
            >
              <div className="settings-item-left">

                <svg
                  viewBox="0 0 48 48"
                  className="item-icon"
                >
                  <path
                    d="M10 12c0-3.3 2.7-6 6-6h16c3.3 0 6 2.7 6 6v13c0 3.3-2.7 6-6 6H22l-8 7v-7h-1c-3.3 0-6-2.7-6-6V12z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />

                  <circle
                    cx="18"
                    cy="18"
                    r="1.5"
                    fill="currentColor"
                  />

                  <circle
                    cx="24"
                    cy="18"
                    r="1.5"
                    fill="currentColor"
                  />

                  <circle
                    cx="30"
                    cy="18"
                    r="1.5"
                    fill="currentColor"
                  />
                </svg>

                <span>
                  Feedback
                </span>

              </div>

              <span className="item-arrow">
                ›
              </span>
            </button>

          </div>

        </section>

      </main>

    </div>
  );
};

export default Settings;