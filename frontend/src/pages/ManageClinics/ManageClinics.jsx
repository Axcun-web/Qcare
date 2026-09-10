import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import DoctorScheduleEditor from "../../components/DoctorScheduleEditor";
import PetugasNavbar from "../../components/PetugasNavbar";
import "./ManageClinics.css";

export default function ManageClinics() {
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);

  const [scheduleOpenId, setScheduleOpenId] = useState(null);
  const [message, setMessage] = useState("");

  const load = () => {
    api("/petugas/clinic")
      .then((res) => {
        setDetail(res.data);
      })
      .catch((e) => setMessage(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timeout);
  }, [message]);

  const submitClinic = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    
    if (data.jamBuka && data.jamTutup) {
      data.jamOperasional = `${data.jamBuka} - ${data.jamTutup}`;
      delete data.jamBuka;
      delete data.jamTutup;
    }

    try {
      await api("/petugas/clinic", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setEditing(null);
      await load();
      setMessage("Klinik berhasil disimpan.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const addDoctor = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await api("/petugas/doctors", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      await load();
      setMessage("Dokter berhasil ditambahkan.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const deleteDoctor = async (id) => {
    if (!window.confirm("Hapus dokter ini?")) return;
    try {
      await api(`/petugas/doctors/${id}`, { method: "DELETE" });
      await load();
      setMessage("Dokter berhasil dihapus.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const editDoctor = async (doc) => {
    const nama = prompt("Nama dokter:", doc.nama);
    const spesialisasi = prompt("Spesialisasi:", doc.spesialisasi);
    if (!nama || !spesialisasi) return;
    try {
      await api(`/petugas/doctors/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ nama, spesialisasi }),
      });
      await load();
      setMessage("Dokter berhasil diperbarui.");
    } catch (err) {
      setMessage(err.message);
    }
  };


  return (
    <div className="manage-clinics-page">
      <PetugasNavbar />
      <main>
        <p className="admin-kicker">MANAJEMEN KLINIK</p>
        <h1>Manajemen Klinik & Dokter</h1>

        {message && <p style={{ color: "#187b51", fontWeight: "bold" }}>{message}</p>}

        <section>
          {detail ? (
            <div className="clinic-layout">
              <div className="clinic-main" style={{ marginLeft: 0, width: "100%" }}>
                <div className="clinic-main-header">
                  <div>
                    <h2>{detail.nama}</h2>
                    <p>
                      {detail.alamat} · ◷ {detail.jamOperasional}
                    </p>
                  </div>
                  <div className="clinic-main-actions">
                    <button onClick={() => setEditing(detail)}>
                      Edit Info Klinik
                    </button>
                  </div>
                </div>

                <div className="member-list">
                  {
                    detail.doctors.map((x) => (
                      <div className="member-block" key={`doc-${x.id}`}>
                        <div className="member">
                          <div>
                            {x.nama}
                            <small>Dokter · {x.spesialisasi}</small>
                          </div>
                          <div className="member-actions">
                            <button
                              type="button"
                              onClick={() =>
                                setScheduleOpenId((current) =>
                                  current === x.id ? null : x.id,
                                )
                              }
                            >
                              {scheduleOpenId === x.id
                                ? "Tutup jadwal"
                                : "Lihat jadwal"}
                            </button>
                            <button
                              type="button"
                              onClick={() => editDoctor(x)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteDoctor(x.id)}
                              className="danger"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                        {scheduleOpenId === x.id && (
                          <div className="doc-schedule">
                            <DoctorScheduleEditor doctor={x} clinicHours={detail.jamOperasional} onChange={load} onError={setMessage} />
                          </div>
                        )}
                      </div>
                    ))}

                  {detail.doctors.length === 0 && (
                    <p className="empty-note">Belum ada dokter.</p>
                  )}
                </div>

                <div className="add-member-forms">
                    <form onSubmit={addDoctor}>
                      <h4>Tambah dokter</h4>
                      <input
                        name="nama"
                        placeholder="Nama dokter"
                        required
                      />
                      <input
                        name="spesialisasi"
                        placeholder="Spesialisasi"
                        required
                      />
                      <button>Tambah dokter</button>
                    </form>
                </div>
              </div>
            </div>
          ) : (
            <p className="empty-note">Memuat data klinik...</p>
          )}
        </section>

        {editing && (
          <div className="modal-backdrop" onClick={() => setEditing(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Edit Info Klinik</h2>
              <form onSubmit={submitClinic}>
                <label>
                  Nama Klinik
                  <input
                    name="nama"
                    defaultValue={editing.nama}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Alamat
                  <input name="alamat" defaultValue={editing.alamat} required />
                </label>
                  <label>
                    No. Telepon
                    <input
                      name="noTelp"
                      defaultValue={editing.noTelp}
                      placeholder="081234567890"
                    />
                  </label>
                  <label>
                    Jam Operasional
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="time"
                        name="jamBuka"
                        defaultValue={editing.jamOperasional?.split(' - ')[0]?.trim() || ''}
                        required
                      />
                      <span>-</span>
                      <input
                        type="time"
                        name="jamTutup"
                        defaultValue={editing.jamOperasional?.split(' - ')[1]?.trim() || ''}
                        required
                      />
                    </div>
                  </label>
                <label>
                  Jenis Layanan
                  <input
                    name="jenisLayanan"
                    defaultValue={editing.jenisLayanan}
                    required
                  />
                </label>
                <div className="modal-actions">
                  <button type="button" onClick={() => setEditing(null)}>
                    Batal
                  </button>
                  <button type="submit" className="primary">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
