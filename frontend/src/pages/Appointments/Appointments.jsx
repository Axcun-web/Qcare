import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { formatQueueNumber } from "../../lib/queueNumber";
import {
  QUEUE_REFRESH_MS,
  formatCallTime,
  formatVisitDate,
} from "../../lib/visitDates";
import PatientNavbar from "../../components/PatientNavbar";
import "./Appointments.css";

const Appointments = () => {
  const navigate = useNavigate();

  const [activeQueues, setActiveQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActiveQueues();
  }, []);

  // Auto-refresh while a queue runs today; future visits have nothing live.
  const hasLiveQueue = activeQueues.some((q) => !q.isFutureVisit);
  useEffect(() => {
    if (!hasLiveQueue) return undefined;
    const interval = setInterval(
      () => fetchActiveQueues({ silent: true }),
      QUEUE_REFRESH_MS,
    );
    return () => clearInterval(interval);
  }, [hasLiveQueue]);

  // silent: background refresh, keep the current view instead of "loading".
  const fetchActiveQueues = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await api("/queues/mine");
      if (response.success) {
        const allQueues = response.data || [];
        const active = allQueues.filter((q) =>
          ["MENUNGGU", "SEDANG_DIPANGGIL", "SEDANG_DILAYANI"].includes(
            q.status,
          ),
        );

        // peopleAhead / estimatedWaitTime / currentQueueNumber come from the
        // backend (queueService.mine -> liveQueueStatus, ML-based estimate).
        // Sort queues so the one with the fewest people ahead (fastest) is at the top
        active.sort((a, b) => a.peopleAhead - b.peopleAhead);

        setActiveQueues(active);
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
      if (!silent) setError("Gagal memuat data janji temu.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCancelQueue = async (id) => {
    const confirmCancel = window.confirm(
      "Apakah Anda yakin ingin membatalkan antrean ini?",
    );
    if (!confirmCancel) return;

    try {
      await api(`/queues/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DIBATALKAN" }),
      });
      fetchActiveQueues();
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
      <PatientNavbar />

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        <section className="appointments-title-section">
          <div>
            <h1>Janji Temu</h1>
            <p>Lihat status nomor antrean Anda.</p>
          </div>
        </section>

        {loading ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}
          >
            Memuat antrean...
          </div>
        ) : error ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}
          >
            {error}
          </div>
        ) : activeQueues.length > 0 ? (
          <section className="appointment-layout">
            <div className="active-queues-list">
              {activeQueues.map((activeQueue) => (
                <div
                  key={activeQueue.id}
                  className="queue-card"
                  style={{ marginBottom: "24px" }}
                >
                  <div className="queue-card-content">
                    <div className="clinic-badge">
                      + {activeQueue.clinic?.nama || "Klinik"}
                    </div>
                    <div className="queue-top">
                      <div className="doctor-information">
                        <h2>{activeQueue.doctor?.nama || "Dokter"}</h2>
                        <p>{activeQueue.doctor?.spesialisasi || "Umum"}</p>
                        <p className="visit-date">
                          Kunjungan: {formatVisitDate(activeQueue.tanggal)}
                        </p>
                      </div>
                      <div className="queue-number">
                        <span>NOMOR ANTREAN</span>
                        <strong>
                          {formatQueueNumber(
                            activeQueue.doctorId,
                            activeQueue.nomorAntrean,
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="waiting-information">
                      <div className="waiting-left">
                        <div className="clock-icon">
                          <span></span>
                        </div>
                        <div>
                          <p>Estimasi Waktu Tunggu</p>
                          <strong>
                            {activeQueue.isFutureVisit
                              ? "Tersedia pada hari kunjungan"
                              : `~${activeQueue.estimatedWaitTime} Menit`}
                          </strong>
                          {!activeQueue.isFutureVisit && activeQueue.estimatedCallTime && (
                            <p className="call-time">
                              Perkiraan dipanggil {formatCallTime(activeQueue.estimatedCallTime)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="current-queue">
                        <p>Antrean Saat Ini</p>
                        <strong>
                          {activeQueue.currentQueueNumber === "-"
                            ? "-"
                            : formatQueueNumber(
                                activeQueue.doctorId,
                                activeQueue.currentQueueNumber,
                              )}
                        </strong>
                      </div>
                    </div>

                    <div className="queue-progress-container">
                      <div className="queue-progress">
                        <div
                          className="queue-progress-fill"
                          style={{
                            width: `${activeQueue.isFutureVisit ? 0 : Math.max(10, 100 - activeQueue.peopleAhead * 20)}%`,
                          }}
                        ></div>
                      </div>
                      <p>
                        {activeQueue.isFutureVisit
                          ? "Antrean dimulai pada hari kunjungan"
                          : activeQueue.peopleAhead > 0
                            ? `${activeQueue.peopleAhead} orang di depan Anda`
                            : "Giliran Anda berikutnya!"}
                      </p>
                    </div>

                    <div
                      className={`queue-status status-text-${activeQueue.status.toLowerCase()}`}
                    >
                      <span
                        className={`status-dot ${activeQueue.status.toLowerCase()}`}
                      ></span>
                      {activeQueue.status === "SEDANG_DIPANGGIL"
                        ? "Menuju Ruang Dokter"
                        : activeQueue.status === "SEDANG_DILAYANI"
                          ? "Sedang Dilayani"
                          : "Menunggu Giliran"}
                    </div>
                  </div>

                  {/* Patients may cancel only while still waiting. */}
                  {activeQueue.status === "MENUNGGU" && (
                    <div className="queue-card-actions">
                      <button
                        className="cancel-btn"
                        onClick={() => handleCancelQueue(activeQueue.id)}
                      >
                        Batalkan Antrean
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <aside className="appointment-sidebar">
              <div className="clinic-info-box">
                <div className="info-circle">i</div>
                <div>
                  <h3>Tetap di area klinik</h3>
                  <p>
                    Pastikan Anda berada di sekitar klinik agar tidak melewatkan
                    giliran.
                  </p>
                </div>
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
        </div>
        <div className="footer-copyright">
          © 2026 Manajemen Klinik QCare. Modernisme Klinis untuk Kesehatan.
        </div>
      </footer>
    </div>
  );
};

export default Appointments;
