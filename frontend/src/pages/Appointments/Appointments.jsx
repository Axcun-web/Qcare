import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Appointments.css";

const Appointments = () => {
  const navigate = useNavigate();

  const [hasQueue, setHasQueue] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleCancelQueue = () => {
    setHasQueue(false);
  };

  const handleTakeQueue = () => {
    navigate("/patient-data");
  };

  return (
    <div className="appointments-page">

      {/* =========================
          HEADER
      ========================= */}
      <header className="appointments-header">
        <div className="appointments-header-inner">

          {/* LOGO */}
          <div className="appointments-logo">
            QCare
          </div>

          {/* NAVIGATION */}
          <nav className="appointments-nav">
            <a href="/">Dashboard</a>
            <a href="#">Clinics</a>

            <a
              href="#"
              className="active"
            >
              Appointments
            </a>

            <a href="#">History</a>
          </nav>

          {/* PROFILE */}
          <div className="profile-wrapper">

            <button
              className="profile-button"
              onClick={() =>
                setShowProfileMenu((prev) => !prev)
              }
              aria-label="Profile menu"
            >
              <span className="profile-icon">
                <span className="profile-head"></span>
                <span className="profile-body"></span>
              </span>
            </button>

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
                  <span className="dropdown-icon settings-icon">
                    ⚙
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
                <span className="dropdown-icon notification-icon"></span>
                Notifications
                </button>

              </div>
            )}

          </div>

        </div>
      </header>


      {/* =========================
          MAIN CONTENT
      ========================= */}
      <main className="appointments-main">

        {/* PAGE TITLE */}
        <section className="appointments-title-section">

          <div>
            <h1>Appointment</h1>

            <p>
              Lihat status nomor antrian Anda.
            </p>
          </div>

        </section>


        {/* =========================
            HAS QUEUE
        ========================= */}
        {hasQueue ? (

          <section className="appointment-layout">

            {/* LEFT CARD */}
            <div className="queue-card">

              <div className="queue-card-content">

                {/* CLINIC */}
                <div className="clinic-badge">
                  + Klinik Utama Sehat
                </div>

                {/* DOCTOR + QUEUE */}
                <div className="queue-top">

                  <div className="doctor-information">
                    <h2>
                      Dr. Jane Doe
                    </h2>

                    <p>
                      Umum
                    </p>
                  </div>

                  <div className="queue-number">
                    <span>
                      NOMOR ANTRIAN
                    </span>

                    <strong>
                      A-12
                    </strong>
                  </div>

                </div>


                {/* WAITING INFO */}
                <div className="waiting-information">

                  <div className="waiting-left">

                    <div className="clock-icon">
                      <span></span>
                    </div>

                    <div>
                      <p>
                        Estimasi Waktu Tunggu
                      </p>

                      <strong>
                        ~15 Menit
                      </strong>
                    </div>

                  </div>

                  <div className="current-queue">

                    <p>
                      Antrian Saat Ini
                    </p>

                    <strong>
                      A-08
                    </strong>

                  </div>

                </div>


                {/* PROGRESS */}
                <div className="queue-progress-container">

                  <div className="queue-progress">
                    <div className="queue-progress-fill"></div>
                  </div>

                  <p>
                    4 orang di depan Anda
                  </p>

                </div>


                {/* STATUS */}
                <div className="queue-status">

                  <span className="status-dot"></span>

                  Anda sedang dalam antrian

                </div>


                {/* CANCEL BUTTON */}
                <button
                  className="cancel-queue-button"
                  onClick={handleCancelQueue}
                >
                  Batalkan Nomor Antrian
                </button>

              </div>

            </div>


            {/* RIGHT SIDE */}
            <aside className="appointment-sidebar">

              {/* INFORMATION */}
              <div className="clinic-info-box">

                <div className="info-circle">
                  i
                </div>

                <div>
                  <h3>
                    Tetap di area klinik
                  </h3>

                  <p>
                    Pastikan Anda berada di sekitar
                    klinik agar tidak melewatkan giliran.
                  </p>
                </div>

              </div>


              {/* CLINIC DETAIL */}
              <div className="clinic-detail-card">

                <h3>
                  Detail Klinik
                </h3>

                <h4>
                  Klinik Utama Sehat
                </h4>

                <p>
                  Layanan: Umum
                </p>

                <button
                  className="clinic-detail-button"
                  type="button"
                >
                  Lihat Detail Klinik
                </button>

              </div>

            </aside>

          </section>

        ) : (

          /* =========================
             NO QUEUE
          ========================= */
          <section className="no-queue-section">

            <div className="no-queue-card">

              <div className="no-queue-icon">
                +
              </div>

              <h2>
                Tidak Memiliki Nomor Antrian
              </h2>

              <p>
                Anda saat ini belum memiliki nomor
                antrian aktif.
              </p>

              <button
                className="take-queue-button"
                onClick={handleTakeQueue}
              >
                Ambil Nomor Antrian
              </button>

            </div>

          </section>

        )}

      </main>


      {/* =========================
          FOOTER
      ========================= */}
      <footer className="appointments-footer">

        <div className="footer-logo">
          QCare
        </div>

        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Support</a>
          <a href="#">Emergency Info</a>
        </div>

        <div className="footer-copyright">
          © 2024 QCare Clinic Management.
          Clinical Modernism for Health.
        </div>

      </footer>

    </div>
  );
};

export default Appointments;