import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./JadwalDokter.css";

const DAYS = [
  { value: "SENIN", label: "Senin" },
  { value: "SELASA", label: "Selasa" },
  { value: "RABU", label: "Rabu" },
  { value: "KAMIS", label: "Kamis" },
  { value: "JUMAT", label: "Jumat" },
  { value: "SABTU", label: "Sabtu" },
  { value: "MINGGU", label: "Minggu" },
];
const DAY_LABEL = Object.fromEntries(DAYS.map((d) => [d.value, d.label]));

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

export default function JadwalDokter() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [detail, setDetail] = useState(null);
  const [message, setMessage] = useState("");

  const load = () =>
    api("/admin/doctors")
      .then((res) => setDoctors(res.data))
      .catch((err) => setMessage(err.message));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const refreshDetail = async (doctorId) => {
    const refreshed = await api("/admin/doctors");
    setDoctors(refreshed.data);
    setDetail(refreshed.data.find((d) => d.id === doctorId) ?? null);
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login");
  };

  const addJadwal = async (e, doctorId) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api(`/admin/doctors/${doctorId}/jadwal`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      form.reset();
      await refreshDetail(doctorId);
      setMessage("Jadwal berhasil ditambahkan.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const editJadwal = async (doctorId, slot) => {
    const jamMulai = prompt("Jam mulai (HH:MM):", formatTime(slot.jamMulai));
    if (!jamMulai) return;
    const jamSelesai = prompt(
      "Jam selesai (HH:MM):",
      formatTime(slot.jamSelesai),
    );
    if (!jamSelesai) return;
    const kuotaAntrean = prompt("Kuota antrean:", slot.kuotaAntrean);
    if (!kuotaAntrean) return;
    try {
      await api(`/admin/jadwal/${slot.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          hari: slot.hari,
          jamMulai,
          jamSelesai,
          kuotaAntrean,
        }),
      });
      await refreshDetail(doctorId);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const deleteJadwal = async (doctorId, slotId) => {
    if (!window.confirm("Hapus jadwal ini?")) return;
    try {
      await api(`/admin/jadwal/${slotId}`, { method: "DELETE" });
      await refreshDetail(doctorId);
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

        <div className="clinic-grid">
          {doctors.map((doc) => (
            <article key={doc.id}>
              <small>{doc.clinic?.nama ?? "Belum ada klinik"}</small>
              <h3>{doc.nama}</h3>
              <p>{doc.spesialisasi}</p>
              <span>{doc.jadwalPraktik.length} hari praktik terjadwal</span>
              <footer>
                <button type="button" onClick={() => setDetail(doc)}>
                  Kelola Jadwal
                </button>
              </footer>
            </article>
          ))}
          {doctors.length === 0 && (
            <p>
              Belum ada dokter. Tambahkan dokter lewat halaman Admin terlebih
              dahulu.
            </p>
          )}
        </div>

        {detail && (
          <div className="admin-modal">
            <div className="clinic-detail">
              <button
                className="modal-close"
                type="button"
                onClick={() => setDetail(null)}
              >
                ×
              </button>
              <p>JADWAL PRAKTIK</p>
              <h2>
                {detail.nama} <small>· {detail.spesialisasi}</small>
              </h2>

              {detail.jadwalPraktik.length === 0 && (
                <p>Belum ada jadwal untuk dokter ini.</p>
              )}
              {detail.jadwalPraktik.map((slot) => (
                <div className="member" key={slot.id}>
                  <div>
                    {DAY_LABEL[slot.hari] ?? slot.hari}
                    <small>
                      {formatTime(slot.jamMulai)}–{formatTime(slot.jamSelesai)}{" "}
                      · Kuota {slot.kuotaAntrean}
                    </small>
                  </div>
                  <div className="member-actions">
                    <button
                      type="button"
                      onClick={() => editJadwal(detail.id, slot)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteJadwal(detail.id, slot.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}

              <form onSubmit={(e) => addJadwal(e, detail.id)}>
                <label>
                  Hari
                  <select name="hari" defaultValue="SENIN">
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Jam mulai
                  <input name="jamMulai" type="time" required />
                </label>
                <label>
                  Jam selesai
                  <input name="jamSelesai" type="time" required />
                </label>
                <label>
                  Kuota antrean
                  <input
                    name="kuotaAntrean"
                    type="number"
                    min="1"
                    defaultValue="20"
                    required
                  />
                </label>
                <button type="submit">Tambah jadwal</button>
              </form>
            </div>
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
