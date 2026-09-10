import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./PetugasDashboard.css";
import PetugasNavbar from "../../components/PetugasNavbar";

export default function PetugasDashboard() {
  const [queues, setQueues] = useState([]);
  const [message, setMessage] = useState("");

  // Filters & Pagination
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadQueue = () => {
    api(`/queues/staff?date=${filterDate}`)
      .then((res) => {
        setQueues(res.data);
      })
      .catch((err) => setMessage(err.message));
  };

  useEffect(() => {
    loadQueue();
    // Auto refresh every 30 seconds
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, [filterDate]);

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timeout);
  }, [message]);

  const updateStatus = async (id, status) => {
    try {
      await api(`/queues/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      loadQueue();
      setMessage("Status antrean berhasil diperbarui.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  // Kalkulasi statistik
  const sisaAntrian = queues.filter((q) => q.status === "MENUNGGU").length;
  const antrianAktif = queues.find((q) => q.status === "SEDANG_DIPANGGIL" || q.status === "SEDANG_DILAYANI");
  const nomorSaatIni = antrianAktif ? antrianAktif.nomorAntrean : "-";

  // Filter Data
  const filteredQueues = queues.filter(q => {
    const matchName = q.recordPasien?.nama?.toLowerCase().includes(searchName.toLowerCase());
    const matchStatus = statusFilter === "ALL" || q.status === statusFilter;
    return matchName && matchStatus;
  });

  // Pagination Data
  const totalPages = Math.ceil(filteredQueues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedQueues = filteredQueues.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, statusFilter, filterDate]);

  return (
    <div className="petugas-page">
      <PetugasNavbar />
      <main>
        <p className="petugas-kicker">MANAJEMEN ANTREAN</p>
        <h1>Dashboard Petugas</h1>

        {message && <div className="message">{message}</div>}

        <div className="petugas-stats">
          <div className="stat-card">
            <h3>Nomor Antrian Saat Ini</h3>
            <div className="value">{nomorSaatIni}</div>
          </div>
          <div className="stat-card">
            <h3>Sisa Antrian</h3>
            <div className="value">{sisaAntrian}</div>
          </div>
        </div>

        <div className="petugas-action">
          <div className="petugas-action-header">
            <h2>Daftar Antrean</h2>
            <p>Kelola antrian pasien untuk klinik Anda.</p>
          </div>
          
          <div className="petugas-filters" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Cari nama pasien..." 
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="MENUNGGU">Menunggu</option>
              <option value="SEDANG_DIPANGGIL">Sedang Dipanggil</option>
              <option value="SEDANG_DILAYANI">Sedang Dilayani</option>
              <option value="SELESAI">Selesai</option>
              <option value="DILEWATI">Dilewati</option>
              <option value="DIBATALKAN">Dibatalkan</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="queue-table">
              <thead>
                <tr>
                  <th>No Antrean</th>
                  <th>Nama Pasien</th>
                  <th>Dokter</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueues.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "32px", color: "#6b7280" }}>
                      Tidak ada antrean yang sesuai.
                    </td>
                  </tr>
                ) : (
                  paginatedQueues.map((q) => (
                    <tr key={q.id}>
                      <td><strong>{q.nomorAntrean}</strong></td>
                      <td>{q.recordPasien?.nama || "-"}</td>
                      <td>{q.doctor?.nama || "-"}</td>
                      <td>
                        <span className={`status-badge status-${q.status}`}>
                          {q.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <div className="queue-actions">
                          {q.status === "MENUNGGU" && (
                            <>
                              <button 
                                className="btn-panggil"
                                onClick={() => updateStatus(q.id, "SEDANG_DIPANGGIL")}
                              >
                                Panggil
                              </button>
                              <button 
                                className="btn-lewati"
                                onClick={() => updateStatus(q.id, "DILEWATI")}
                              >
                                Lewati
                              </button>
                            </>
                          )}
                          {(q.status === "SEDANG_DIPANGGIL") && (
                            <>
                              <button 
                                className="btn-panggil"
                                onClick={() => updateStatus(q.id, "SEDANG_DILAYANI")}
                              >
                                Mulai Dilayani
                              </button>
                              <button 
                                className="btn-lewati"
                                onClick={() => updateStatus(q.id, "DILEWATI")}
                              >
                                Lewati
                              </button>
                            </>
                          )}
                          {q.status === "SEDANG_DILAYANI" && (
                            <button 
                              className="btn-selesai"
                              onClick={() => updateStatus(q.id, "SELESAI")}
                            >
                              Selesai
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: currentPage === 1 ? '#f9fafb' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Sebelumnya
              </button>
              <span style={{ fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>Halaman {currentPage} dari {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: currentPage === totalPages ? '#f9fafb' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
