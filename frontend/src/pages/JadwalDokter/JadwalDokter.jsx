import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./JadwalDokter.css";

const DAYS = [
  { value: "SENIN", label: "Senin", short: "Sen" },
  { value: "SELASA", label: "Selasa", short: "Sel" },
  { value: "RABU", label: "Rabu", short: "Rab" },
  { value: "KAMIS", label: "Kamis", short: "Kam" },
  { value: "JUMAT", label: "Jumat", short: "Jum" },
  { value: "SABTU", label: "Sabtu", short: "Sab" },
  { value: "MINGGU", label: "Minggu", short: "Min" },
];

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

const toHHMM = (value) => {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
};

const initials = (nama) =>
  nama
    .replace(/^dr\.?\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M18 7l-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function WeekStrip({ jadwalPraktik }) {
  const scheduledDays = new Set(jadwalPraktik.map((s) => s.hari));
  return (
    <div
      className="week-strip"
      role="img"
      aria-label={`${jadwalPraktik.length} dari 7 hari terjadwal`}
    >
      {DAYS.map((d) => (
        <span
          key={d.value}
          className={`week-chip${scheduledDays.has(d.value) ? " week-chip--active" : ""}`}
          title={d.label}
        >
          {d.short[0]}
        </span>
      ))}
    </div>
  );
}

function SlotForm({ initial, onCancel, onSubmit }) {
  return (
    <form className="slot-form" onSubmit={onSubmit}>
      <div className="slot-form-fields">
        <label>
          Jam mulai
          <input
            name="jamMulai"
            type="time"
            defaultValue={initial?.jamMulai}
            required
          />
        </label>
        <label>
          Jam selesai
          <input
            name="jamSelesai"
            type="time"
            defaultValue={initial?.jamSelesai}
            required
          />
        </label>
        <label>
          Kuota
          <input
            name="kuotaAntrean"
            type="number"
            min="1"
            defaultValue={initial?.kuotaAntrean ?? 20}
            required
          />
        </label>
      </div>
      <div className="slot-form-actions">
        <button type="button" className="slot-cancel" onClick={onCancel}>
          Batal
        </button>
        <button type="submit" className="slot-save">
          Simpan
        </button>
      </div>
    </form>
  );
}

export default function JadwalDokter() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("");
  const [addingDay, setAddingDay] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const load = () =>
    api("/admin/doctors")
      .then((res) => {
        setDoctors(res.data);
        setSelectedId((current) => current ?? res.data[0]?.id ?? null);
      })
      .catch((err) => setMessage(err.message));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const detail = useMemo(
    () => doctors.find((d) => d.id === selectedId) ?? null,
    [doctors, selectedId],
  );

  const stats = useMemo(() => {
    const withoutSchedule = doctors.filter(
      (d) => d.jadwalPraktik.length === 0,
    ).length;
    const totalSlots = doctors.reduce(
      (sum, d) => sum + d.jadwalPraktik.length,
      0,
    );
    return { withoutSchedule, totalSlots };
  }, [doctors]);

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login");
  };

  const selectDoctor = (id) => {
    setSelectedId(id);
    setAddingDay(null);
    setEditingId(null);
  };

  const refresh = () =>
    api("/admin/doctors").then((res) => setDoctors(res.data));

  const submitAdd = async (e, doctorId, hari) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/admin/doctors/${doctorId}/jadwal`, {
        method: "POST",
        body: JSON.stringify({ hari, ...data }),
      });
      setAddingDay(null);
      await refresh();
      setMessage("Jadwal berhasil ditambahkan.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const submitEdit = async (e, slotId, hari) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/admin/jadwal/${slotId}`, {
        method: "PATCH",
        body: JSON.stringify({ hari, ...data }),
      });
      setEditingId(null);
      await refresh();
      setMessage("Jadwal berhasil diperbarui.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const deleteJadwal = async (slotId) => {
    if (!window.confirm("Hapus jadwal ini?")) return;
    try {
      await api(`/admin/jadwal/${slotId}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="admin-page">
      <header>
        <div>
          <b>QCare</b>
          <small>SUPERADMIN CONSOLE</small>
        </div>
        <div>
          <button
            type="button"
            className="ghost"
            onClick={() => navigate("/admin")}
          >
            ← Kembali ke Admin
          </button>
          {user?.nama}
          <button onClick={handleLogout}>Log Out</button>
        </div>
      </header>
      <main>
        <p className="admin-kicker">MANAJEMEN SISTEM</p>
        <h1>Jadwal Praktik Dokter</h1>
        <p className="page-subtitle">
          Atur hari dan jam praktik tiap dokter, beserta kuota antrean per sesi.
        </p>

        {doctors.length > 0 && (
          <div className="stats-row">
            <div className="stat-tile">
              <UsersIcon />
              <div>
                <strong>{doctors.length}</strong>
                <span>Dokter terdaftar</span>
              </div>
            </div>
            <div className="stat-tile">
              <ClockIcon />
              <div>
                <strong>{stats.totalSlots}</strong>
                <span>Total sesi terjadwal</span>
              </div>
            </div>
            {stats.withoutSchedule > 0 && (
              <div className="stat-tile stat-tile--warn">
                <AlertIcon />
                <div>
                  <strong>{stats.withoutSchedule}</strong>
                  <span>Dokter belum punya jadwal</span>
                </div>
              </div>
            )}
          </div>
        )}

        {doctors.length === 0 ? (
          <p className="empty-note">
            Belum ada dokter. Tambahkan dokter lewat halaman Admin terlebih
            dahulu.
          </p>
        ) : (
          <div className="schedule-layout">
            <div className="doctor-list">
              {doctors.map((doc) => (
                <button
                  type="button"
                  key={doc.id}
                  className={`doctor-row${doc.id === selectedId ? " doctor-row--active" : ""}`}
                  onClick={() => selectDoctor(doc.id)}
                >
                  <div className="doctor-avatar">{initials(doc.nama)}</div>
                  <div className="doctor-row-info">
                    <span className="doctor-row-name">{doc.nama}</span>
                    <span className="doctor-meta">
                      {doc.spesialisasi} ·{" "}
                      {doc.clinic?.nama ?? "Belum ada klinik"}
                    </span>
                    <WeekStrip jadwalPraktik={doc.jadwalPraktik} />
                  </div>
                </button>
              ))}
            </div>

            {detail && (
              <div className="schedule-main">
                <div className="panel-doctor">
                  <div className="doctor-avatar doctor-avatar--lg">
                    {initials(detail.nama)}
                  </div>
                  <div>
                    <h2>{detail.nama}</h2>
                    <p className="doctor-meta">
                      {detail.spesialisasi} · {detail.clinic?.nama}
                    </p>
                  </div>
                </div>

                <div className="day-list">
                  {DAYS.map((d) => {
                    const slot = detail.jadwalPraktik.find(
                      (s) => s.hari === d.value,
                    );
                    const isEditing = slot && editingId === slot.id;
                    const isAdding = !slot && addingDay === d.value;

                    return (
                      <div
                        className={`day-row${slot ? "" : " day-row--off"}`}
                        key={d.value}
                      >
                        <div className="day-row-label">{d.label}</div>

                        {isEditing && (
                          <SlotForm
                            initial={{
                              jamMulai: toHHMM(slot.jamMulai),
                              jamSelesai: toHHMM(slot.jamSelesai),
                              kuotaAntrean: slot.kuotaAntrean,
                            }}
                            onCancel={() => setEditingId(null)}
                            onSubmit={(e) => submitEdit(e, slot.id, d.value)}
                          />
                        )}

                        {isAdding && (
                          <SlotForm
                            onCancel={() => setAddingDay(null)}
                            onSubmit={(e) => submitAdd(e, detail.id, d.value)}
                          />
                        )}

                        {!isEditing && !isAdding && slot && (
                          <div className="day-row-info">
                            <span className="day-time">
                              {formatTime(slot.jamMulai)}–
                              {formatTime(slot.jamSelesai)}
                            </span>
                            <span className="day-quota">
                              Kuota {slot.kuotaAntrean}
                            </span>
                            <div className="day-row-actions">
                              <button
                                type="button"
                                aria-label={`Edit jadwal ${d.label}`}
                                onClick={() => setEditingId(slot.id)}
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                className="danger"
                                aria-label={`Hapus jadwal ${d.label}`}
                                onClick={() => deleteJadwal(slot.id)}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                        )}

                        {!isEditing && !isAdding && !slot && (
                          <div className="day-row-info">
                            <span className="day-off-label">Libur</span>
                            <button
                              type="button"
                              className="day-add-btn"
                              onClick={() => setAddingDay(d.value)}
                            >
                              <PlusIcon /> Tambah
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className="admin-message">
            <span>{message}</span>
            <button aria-label="Tutup pesan" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
