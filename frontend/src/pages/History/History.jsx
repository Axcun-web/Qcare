import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import "./History.css";

const STATUS_META = {
  MENUNGGU: { label: "Menunggu", className: "status-waiting" },
  SEDANG_DIPANGGIL: { label: "Sedang Dipanggil", className: "status-called" },
  SEDANG_DILAYANI: { label: "Sedang Dilayani", className: "status-serving" },
  SELESAI: { label: "Selesai", className: "status-done" },
  DILEWATI: { label: "Dilewati", className: "status-skipped" },
  DIBATALKAN: { label: "Dibatalkan", className: "status-cancelled" },
};

const FILTERS = [
  { value: "SEMUA", label: "Semua" },
  { value: "SELESAI", label: "Selesai" },
  { value: "DILEWATI", label: "Dilewati" },
  { value: "DIBATALKAN", label: "Dibatalkan" },
];

const formatDate = (value) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

const History = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("SEMUA");

  useEffect(() => {
    api("/queues/mine")
      .then((res) => setEntries(res.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleEntries =
    filter === "SEMUA"
      ? entries
      : entries.filter((entry) => entry.status === filter);

  return (
    <div className="dashboard-page">
      {/* SHARED DASHBOARD HEADER */}
      <header className="dashboard-header">
        <Link to="/patient" className="logo">
          QCare
        </Link>

        <nav className="header-nav">
          <Link to="/patient" className="nav-link">
            Dashboard
          </Link>
          <Link to="/clinics" className="nav-link">
            Klinik
          </Link>
          <Link to="/appointments" className="nav-link">
            Janji Temu
          </Link>
          <Link to="/history" className="nav-link active">
            Riwayat
          </Link>
        </nav>

        <div className="header-right">
          <div className="profile-wrapper">
            <div
              className="profile-pic"
              onClick={() => setShowProfileMenu((prev) => !prev)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
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
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="16"
                      height="16"
                    >
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
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="16"
                      height="16"
                    >
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
        <section className="history-title-section">
          <div>
            <h1>Riwayat Antrean</h1>
            <p>Daftar seluruh antrean yang pernah Anda ambil.</p>
          </div>

          <div className="history-filters">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`filter-chip${filter === item.value ? " active" : ""}`}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {loading && <p className="history-state">Memuat riwayat...</p>}

        {!loading && error && (
          <div className="history-state history-error">
            <p>Gagal memuat riwayat: {error}</p>
          </div>
        )}

        {!loading && !error && visibleEntries.length === 0 && (
          <section className="no-history-section">
            <div className="no-history-card">
              <div className="no-history-icon">🕒</div>
              <h2>Belum Ada Riwayat</h2>
              <p>
                {filter === "SEMUA"
                  ? "Anda belum pernah mengambil nomor antrean."
                  : "Tidak ada riwayat dengan status ini."}
              </p>
              <button
                className="take-queue-button"
                type="button"
                onClick={() => navigate("/patient-data")}
              >
                Ambil Nomor Antrean
              </button>
            </div>
          </section>
        )}

        {!loading && !error && visibleEntries.length > 0 && (
          <ul className="history-full-list">
            {visibleEntries.map((entry) => {
              const meta = STATUS_META[entry.status] ?? {
                label: entry.status,
                className: "",
              };
              return (
                <li key={entry.id} className="history-full-item">
                  <div className="history-full-main">
                    <span className="history-queue-number">
                      #{entry.nomorAntrean}
                    </span>
                    <div>
                      <strong>{entry.clinic?.nama ?? "-"}</strong>
                      <p>
                        {entry.doctor?.nama ?? "-"}
                        {entry.doctor?.spesialisasi
                          ? ` · ${entry.doctor.spesialisasi}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="history-full-meta">
                    <span className="history-date">
                      {formatDate(entry.tanggal)}
                    </span>
                    {entry.jadwal && (
                      <span className="history-time">
                        {formatTime(entry.jadwal.jamMulai)}–
                        {formatTime(entry.jadwal.jamSelesai)}
                      </span>
                    )}
                    <span className={`status-badge ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* SHARED DASHBOARD FOOTER */}
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

export default History;
