import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import PatientNavbar from "../../components/PatientNavbar";
import "./History.css";

const STATUS_META = {
  MENUNGGU: { label: "Menunggu", className: "status-MENUNGGU" },
  SEDANG_DIPANGGIL: { label: "Sedang Dipanggil", className: "status-SEDANG_DIPANGGIL" },
  SEDANG_DILAYANI: { label: "Sedang Dilayani", className: "status-SEDANG_DILAYANI" },
  SELESAI: { label: "Selesai", className: "status-SELESAI" },
  DILEWATI: { label: "Dilewati", className: "status-DILEWATI" },
  DIBATALKAN: { label: "Dibatalkan", className: "status-DIBATALKAN" },
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
    hour12: false,
    timeZone: "UTC",
  });

const History = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("SEMUA");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    api("/queues/mine")
      .then((res) => setEntries(res.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredEntries =
    filter === "SEMUA"
      ? entries
      : entries.filter((entry) => entry.status === filter);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);

  // Reset page to 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  return (
    <div className="dashboard-page">
      <PatientNavbar />

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
                        {formatDate(entry.updatedAt || entry.tanggal)}
                      </span>
                      <span className="history-time">
                        {new Date(entry.updatedAt || entry.tanggal).toLocaleTimeString('id-ID', {
                          hour: '2-digit', minute: '2-digit', hour12: false
                        })}
                      </span>
                      <span className={`status-badge ${meta.className}`}>
                        {meta.label}
                      </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', paddingBottom: '16px' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #d1d5db', background: currentPage === 1 ? '#f3f4f6' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Sebelumnya
              </button>
              <span style={{ fontSize: '14px', color: '#4b5563' }}>Halaman {currentPage} dari {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #d1d5db', background: currentPage === totalPages ? '#f3f4f6' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Selanjutnya
              </button>
            </div>
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
