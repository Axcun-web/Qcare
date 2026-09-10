import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import DoctorSchedule from "../../components/DoctorSchedule";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

const emptyClinic = {
  nama: "",
  alamat: "",
  jamOperasional: "",
  jenisLayanan: "",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("clinics"),
    [clinics, setClinics] = useState([]),
    [users, setUsers] = useState([]),
    [feedback, setFeedback] = useState([]),
    [editing, setEditing] = useState(null),
    [selectedClinicId, setSelectedClinicId] = useState(null),
    [detail, setDetail] = useState(null),
    [memberFilter, setMemberFilter] = useState("ALL"),
    [scheduleOpenId, setScheduleOpenId] = useState(null),
    [message, setMessage] = useState("");

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    navigate("/login");
  };

  const load = () =>
    Promise.all([
      api("/admin/clinics"),
      api("/admin/users"),
      api("/admin/feedback"),
    ])
      .then(([c, u, f]) => {
        setClinics(c.data);
        setSelectedClinicId((current) => current ?? c.data[0]?.id ?? null);
        setUsers(u.data);
        setFeedback(f.data);
      })
      .catch((e) => setMessage(e.message));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedClinicId) {
      setDetail(null);
      return;
    }
    api(`/admin/clinics/${selectedClinicId}`)
      .then((res) => setDetail(res.data))
      .catch((err) => setMessage(err.message));
  }, [selectedClinicId]);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const refreshDetail = async () => {
    if (!selectedClinicId) return;
    const res = await api(`/admin/clinics/${selectedClinicId}`);
    setDetail(res.data);
  };

  const selectClinic = (id) => {
    setSelectedClinicId(id);
    setMemberFilter("ALL");
    setScheduleOpenId(null);
  };

  const submitClinic = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(
        editing?.id ? `/admin/clinics/${editing.id}` : "/admin/clinics",
        {
          method: editing?.id ? "PATCH" : "POST",
          body: JSON.stringify(data),
        },
      );
      setEditing(null);
      await load();
      await refreshDetail();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const deleteClinic = async (id) => {
    if (!window.confirm("Hapus klinik ini?")) return;
    try {
      await api(`/admin/clinics/${id}`, { method: "DELETE" });
      if (id === selectedClinicId) setSelectedClinicId(null);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const addMember = async (e, path) => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await api(path, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      await refreshDetail();
      await load();
      setMessage("Data berhasil ditambahkan.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const deleteDoctor = async (id) => {
    if (!window.confirm("Hapus dokter ini?")) return;
    try {
      await api(`/admin/doctors/${id}`, { method: "DELETE" });
      await refreshDetail();
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const editDoctor = async (doc) => {
    const nama = prompt("Nama dokter:", doc.nama);
    const spesialisasi = prompt("Spesialisasi:", doc.spesialisasi);
    if (!nama || !spesialisasi) return;
    try {
      await api(`/admin/doctors/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ nama, spesialisasi }),
      });
      await refreshDetail();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const deleteStaff = async (id) => {
    if (!window.confirm("Hapus petugas ini?")) return;
    try {
      await api(`/admin/users/${id}`, { method: "DELETE" });
      await refreshDetail();
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const editStaff = async (staff) => {
    const nama = prompt("Nama petugas:", staff.nama);
    if (!nama) return;
    try {
      await api(`/admin/users/${staff.id}`, {
        method: "PATCH",
        body: JSON.stringify({ nama }),
      });
      await refreshDetail();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const editUser = async (e, item) => {
    e.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      data.isActive = e.currentTarget.elements.isActive.checked;
      await api(`/admin/users/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      load();
      setMessage("Data pengguna diperbarui.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const showDoctors = memberFilter !== "PETUGAS";
  const showStaff = memberFilter !== "DOKTER";

  return (
    <div className="admin-page">
      <header>
        <div>
          <b>QCare</b>
          <small>CONSOLE SUPERADMIN</small>
        </div>
        <div>
          {user?.nama}
          <button onClick={handleLogout}>Log Out</button>
        </div>
      </header>
      <main>
        <p className="admin-kicker">MANAJEMEN SISTEM</p>
        <h1>Administrasi QCare</h1>
        <nav className="admin-tabs">
          {[
            ["clinics", "Klinik"],
            ["users", "User"],
            ["feedback", "Feedback"],
          ].map(([id, name]) => (
            <button
              className={tab === id ? "selected" : ""}
              onClick={() => setTab(id)}
              key={id}
            >
              {name}
            </button>
          ))}
        </nav>

        {tab === "clinics" && (
          <section>
            <div className="admin-action">
              <div>
                <h2>Daftar klinik</h2>
                <p>Kelola detail, dokter, jadwal, dan petugas per klinik.</p>
              </div>
              <button onClick={() => setEditing(emptyClinic)}>
                + Tambah klinik
              </button>
            </div>

            {clinics.length === 0 ? (
              <p className="empty-note">Belum ada klinik.</p>
            ) : (
              <div className="clinic-layout">
                <div className="clinic-list">
                  {clinics.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className={`clinic-row${c.id === selectedClinicId ? " clinic-row--active" : ""}`}
                      onClick={() => selectClinic(c.id)}
                    >
                      <strong>{c.nama}</strong>
                      <small>{c.jenisLayanan}</small>
                      <span className="counts">
                        {c._count.doctors} dokter · {c._count.users} petugas
                      </span>
                    </button>
                  ))}
                </div>

                {detail && (
                  <div className="clinic-main">
                    <div className="clinic-main-header">
                      <div>
                        <h2>{detail.nama}</h2>
                        <p>
                          {detail.alamat} · ◷ {detail.jamOperasional}
                        </p>
                      </div>
                      <div className="clinic-main-actions">
                        <button onClick={() => setEditing(detail)}>
                          Edit klinik
                        </button>
                        <button
                          className="danger"
                          onClick={() => deleteClinic(detail.id)}
                        >
                          Hapus klinik
                        </button>
                      </div>
                    </div>

                    <div className="member-filter">
                      <label htmlFor="member-filter">Tampilkan</label>
                      <select
                        id="member-filter"
                        value={memberFilter}
                        onChange={(e) => setMemberFilter(e.target.value)}
                      >
                        <option value="ALL">Semua</option>
                        <option value="DOKTER">Dokter</option>
                        <option value="PETUGAS">Petugas</option>
                      </select>
                    </div>

                    <div className="member-list">
                      {showDoctors &&
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
                              </div>
                            </div>
                            {scheduleOpenId === x.id && (
                              <DoctorSchedule doctor={x} />
                            )}
                          </div>
                        ))}

                      {showStaff &&
                        detail.users.map((x) => (
                          <div className="member" key={`staff-${x.id}`}>
                            <div>
                              {x.nama}
                              <small>Petugas · {x.email}</small>
                            </div>
                            <div className="member-actions">
                              <button
                                type="button"
                                onClick={() => editStaff(x)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteStaff(x.id)}
                                className="danger"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        ))}

                      {showDoctors && detail.doctors.length === 0 && (
                        <p className="empty-note">Belum ada dokter.</p>
                      )}
                      {showStaff &&
                        !showDoctors &&
                        detail.users.length === 0 && (
                          <p className="empty-note">Belum ada petugas.</p>
                        )}
                    </div>

                    <div className="add-member-forms">

                      {showStaff && (
                        <form
                          onSubmit={(e) =>
                            addMember(e, `/admin/clinics/${detail.id}/staff`)
                          }
                        >
                          <h4>Tambah petugas</h4>
                          <input
                            name="nama"
                            placeholder="Nama petugas"
                            required
                          />
                          <input
                            name="email"
                            type="email"
                            placeholder="Email"
                            required
                          />
                          <input
                            name="password"
                            type="password"
                            placeholder="Password awal (min. 8)"
                            minLength="8"
                            required
                          />
                          <input name="noHp" placeholder="Nomor HP" />
                          <button>Tambah petugas</button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {tab === "users" && (
          <section className="management">
            <h2>Edit data user</h2>
            <p>Ubah data akun User di sini.</p>
            {users.map((item) => (
              <form
                className="edit-user"
                key={item.id}
                onSubmit={(e) => editUser(e, item)}
              >
                <div>
                  <b>{item.nama}</b>
                  <small>
                    {item.role}
                    {item.clinic?.nama
                      ? ` · ${item.clinic.nama}`
                      : item.role === "PETUGAS"
                        ? " · Tidak terhubung ke klinik"
                        : ""}
                  </small>
                </div>
                <input name="nama" defaultValue={item.nama} />
                <input name="email" type="email" defaultValue={item.email} />
                <input
                  name="noHp"
                  defaultValue={item.noHp ?? ""}
                  placeholder="Nomor HP"
                />
                <label className="toggle">
                  Aktif
                  <input
                    name="isActive"
                    type="checkbox"
                    defaultChecked={item.isActive}
                  />
                </label>
                <button>Simpan</button>
              </form>
            ))}
          </section>
        )}

        {tab === "feedback" && (
          <section className="management">
            <h2>Feedback User</h2>
            {feedback.length ? (
              feedback.map((item) => (
                <article className="feedback" key={item.id}>
                  <b>{item.user.nama}</b>
                  <span>
                    {item.rating ? "★".repeat(item.rating) : "Tanpa rating"} ·{" "}
                    {item.antrean?.clinic?.nama ?? "Kunjungan umum"}
                  </span>
                  <p>{item.isi}</p>
                </article>
              ))
            ) : (
              <p>Belum ada feedback masuk.</p>
            )}
          </section>
        )}

        {editing && (
          <div className="admin-modal">
            <form onSubmit={submitClinic}>
              <button type="button" onClick={() => setEditing(null)}>
                ×
              </button>
              <h2>{editing.id ? "Edit klinik" : "Tambah klinik"}</h2>
              {Object.entries(emptyClinic).map(([key]) => (
                <label key={key}>
                  {key === "jamOperasional"
                    ? "Jam operasional"
                    : key === "jenisLayanan"
                      ? "Jenis layanan"
                      : key[0].toUpperCase() + key.slice(1)}
                  <input name={key} defaultValue={editing[key]} required />
                </label>
              ))}
              <button className="save">Simpan klinik</button>
            </form>
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
