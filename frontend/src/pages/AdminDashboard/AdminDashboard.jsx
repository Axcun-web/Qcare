import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, withActiveUserConfirm } from "../../lib/api";
import DoctorSchedule from "../../components/DoctorSchedule";
import NotificationBell from "../../components/NotificationBell";
import { confirmLogout } from "../../lib/confirmLogout";
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
  const [tab, setTab] = useState("home"),
    [clinics, setClinics] = useState([]),
    [users, setUsers] = useState([]),
    [feedback, setFeedback] = useState([]),
    [editing, setEditing] = useState(null),
    [selectedClinicId, setSelectedClinicId] = useState(null),
    [detail, setDetail] = useState(null),
    [memberFilter, setMemberFilter] = useState("ALL"),
    [feedbackFilter, setFeedbackFilter] = useState("ALL"),
    [feedbackPage, setFeedbackPage] = useState(1),
    [scheduleOpenId, setScheduleOpenId] = useState(null),
    [message, setMessage] = useState(""),
    // { nama, password } after an admin password reset, shown once.
    [resetResult, setResetResult] = useState(null),
    // Gbr 3.83 home stats
    [overview, setOverview] = useState(null),
    // Users tab: server-side search, filters and paging
    [userQuery, setUserQuery] = useState({
      q: "",
      role: "",
      status: "",
      page: 1,
    }),
    [searchText, setSearchText] = useState(""),
    [userMeta, setUserMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const handleLogout = () => {
    if (!confirmLogout()) return;
    if (logout) {
      logout();
    }
    navigate("/login");
  };

  const load = () =>
    Promise.all([
      api("/admin/clinics"),
      api("/admin/overview"),
      api("/admin/feedback"),
    ])
      .then(([c, o, f]) => {
        setClinics(c.data);
        setSelectedClinicId((current) => current ?? c.data[0]?.id ?? null);
        setOverview(o.data);
        setFeedback(f.data);
      })
      .catch((e) => setMessage(e.message));

  const loadUsers = () => {
    const params = new URLSearchParams({ page: String(userQuery.page) });
    if (userQuery.q) params.set("q", userQuery.q);
    if (userQuery.role) params.set("role", userQuery.role);
    if (userQuery.status) params.set("status", userQuery.status);
    return api(`/admin/users?${params}`)
      .then((res) => {
        setUsers(res.data);
        setUserMeta(res.meta);
      })
      .catch((e) => setMessage(e.message));
  };

  // Reload when the filters change, and whenever the Users tab is opened
  // (staff can also be edited from the Klinik tab).
  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [userQuery, tab]);

  // Search as you type, but only after a short pause.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setUserQuery((current) =>
        current.q === searchText.trim()
          ? current
          : { ...current, q: searchText.trim(), page: 1 },
      );
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchText]);

  const setUserFilter = (key, value) =>
    setUserQuery((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? value : 1,
    }));

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

  // DELETE /admin/doctors/:id soft-deletes (isActive: false), so this is a
  // toggle, not a removal - the row stays in the list either way (same
  // pattern as toggleStaffActive below).
  const toggleDoctorActive = async (doctor) => {
    const activating = doctor.isActive === false;
    if (!activating && !window.confirm("Nonaktifkan dokter ini?")) return;
    try {
      if (activating) {
        await api(`/admin/doctors/${doctor.id}`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: true }),
        });
      } else {
        await api(`/admin/doctors/${doctor.id}`, { method: "DELETE" });
      }
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

  // DELETE /admin/users/:id soft-deletes (isActive: false), so this is a
  // toggle, not a removal - the row stays in the list either way.
  const toggleStaffActive = async (staff) => {
    const activating = staff.isActive === false;
    if (!activating && !window.confirm("Nonaktifkan petugas ini?")) return;
    try {
      if (activating) {
        await api(`/admin/users/${staff.id}`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: true }),
        });
      } else {
        // Tabel 3.19 exc. 3: confirm again if this Petugas is online now.
        const done = await withActiveUserConfirm((query) =>
          api(`/admin/users/${staff.id}${query}`, { method: "DELETE" }),
        );
        if (done === null) return;
      }
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
      // Unticking "Aktif" for someone online now asks for confirmation
      // (Tabel 3.19 exc. 3).
      const done = await withActiveUserConfirm((query) =>
        api(`/admin/users/${item.id}${query}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      );
      if (done === null) return;
      loadUsers();
      setMessage("Data pengguna diperbarui.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  // Tabel 3.19 "mereset password": the temporary password is shown once.
  const resetPassword = async (item) => {
    if (
      !window.confirm(
        `Reset password ${item.nama}? Password lama tidak dapat dipakai lagi.`,
      )
    )
      return;
    try {
      const res = await api(`/admin/users/${item.id}/reset-password`, {
        method: "POST",
      });
      setResetResult({ nama: item.nama, password: res.data.temporaryPassword });
    } catch (err) {
      setMessage(err.message);
    }
  };

  const copyResetPassword = async () => {
    try {
      await navigator.clipboard.writeText(resetResult.password);
      setMessage("Password sementara disalin.");
    } catch {
      setMessage("Salin manual: clipboard tidak dapat diakses.");
    }
  };

  const showDoctors = memberFilter !== "PETUGAS";
  const showStaff = memberFilter !== "DOKTER";

  const FEEDBACK_PER_PAGE = 10;
  const filteredFeedbackList = feedback.filter((f) =>
    feedbackFilter === "ALL" ? true : f.rating === parseInt(feedbackFilter),
  );
  const paginatedFeedback = filteredFeedbackList.slice(
    (feedbackPage - 1) * FEEDBACK_PER_PAGE,
    feedbackPage * FEEDBACK_PER_PAGE,
  );
  const totalFeedbackPages =
    Math.ceil(filteredFeedbackList.length / FEEDBACK_PER_PAGE) || 1;

  return (
    <div className="admin-page">
      <header>
        <div>
          <b>QCare</b>
          <small>CONSOLE SUPERADMIN</small>
        </div>
        <div className="admin-header-right">
          <NotificationBell />
          {user?.nama}
          <button onClick={() => navigate("/settings")}>Pengaturan</button>
          <button onClick={handleLogout}>Log Out</button>
        </div>
      </header>
      <main>
        <p className="admin-kicker">MANAJEMEN SISTEM</p>
        <h1>Administrasi QCare</h1>
        <nav className="admin-tabs">
          {[
            ["home", "Beranda"],
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

        {tab === "home" && (
          <section className="admin-home">
            <div className="admin-stats">
              {[
                ["Total Klinik", overview?.totalKlinik],
                ["Total Dokter", overview?.totalDokter],
                ["Total Petugas", overview?.totalPetugas],
                ["Total Pasien", overview?.totalPasien],
              ].map(([label, value]) => (
                <div className="admin-stat" key={label}>
                  <span>{label}</span>
                  <strong>{value ?? "-"}</strong>
                </div>
              ))}
            </div>
            <div className="admin-home-grid">
              <div className="admin-home-card">
                <h2>Klinik teramai</h2>
                <p className="admin-home-sub">
                  Antrean (tanpa dibatalkan), 30 hari terakhir
                </p>
                {overview?.klinikTeramai ? (
                  <>
                    <strong className="busiest-name">
                      {overview.klinikTeramai.nama}
                    </strong>
                    <span className="busiest-count">
                      {overview.klinikTeramai.antrean30Hari} antrean
                    </span>
                  </>
                ) : (
                  <p className="empty-note">
                    Belum ada antrean dalam 30 hari terakhir.
                  </p>
                )}
              </div>
              <div className="admin-home-card">
                <h2>Feedback &amp; keluhan terbaru</h2>
                {overview?.feedbackTerbaru?.length ? (
                  <ul className="latest-feedback">
                    {overview.feedbackTerbaru.map((item) => (
                      <li key={item.id}>
                        <div>
                          <b>{item.user?.nama ?? "Pengguna"}</b>
                          {item.rating ? (
                            <span> · {"★".repeat(item.rating)}</span>
                          ) : null}
                        </div>
                        <p>{item.isi}</p>
                        <small>
                          {new Date(item.tanggalKirim).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-note">Belum ada feedback.</p>
                )}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setTab("feedback")}
                >
                  Lihat semua feedback →
                </button>
              </div>
            </div>
          </section>
        )}

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
                            <div
                              className={`member${x.isActive === false ? " member--inactive" : ""}`}
                            >
                              <div>
                                {x.nama}
                                {x.isActive === false && (
                                  <span className="inactive-badge">
                                    Nonaktif
                                  </span>
                                )}
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
                                  onClick={() => toggleDoctorActive(x)}
                                  className={
                                    x.isActive === false ? "" : "danger"
                                  }
                                >
                                  {x.isActive === false
                                    ? "Aktifkan"
                                    : "Nonaktifkan"}
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
                          <div
                            className={`member${x.isActive === false ? " member--inactive" : ""}`}
                            key={`staff-${x.id}`}
                          >
                            <div>
                              {x.nama}
                              {x.isActive === false && (
                                <span className="inactive-badge">Nonaktif</span>
                              )}
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
                                onClick={() => toggleStaffActive(x)}
                                className={x.isActive === false ? "" : "danger"}
                              >
                                {x.isActive === false
                                  ? "Aktifkan"
                                  : "Nonaktifkan"}
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
            <div className="user-filters">
              <input
                type="search"
                placeholder="Cari nama atau email"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                aria-label="Cari pengguna"
              />
              <select
                value={userQuery.role}
                onChange={(e) => setUserFilter("role", e.target.value)}
                aria-label="Filter role"
              >
                <option value="">Semua role</option>
                <option value="PASIEN">Pasien</option>
                <option value="PETUGAS">Petugas</option>
                <option value="SUPERADMIN">Super Admin</option>
              </select>
              <select
                value={userQuery.status}
                onChange={(e) => setUserFilter("status", e.target.value)}
                aria-label="Filter status"
              >
                <option value="">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
              <span className="user-count">{userMeta.total} pengguna</span>
            </div>
            {users.length === 0 && (
              <p className="empty-note">Tidak ada pengguna yang cocok.</p>
            )}
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
                <div className="edit-user-actions">
                  <button>Simpan</button>
                  {item.id !== user?.id && (
                    <button
                      type="button"
                      className="reset-password"
                      onClick={() => resetPassword(item)}
                    >
                      Reset password
                    </button>
                  )}
                </div>
              </form>
            ))}
            <div className="user-pager">
              <button
                type="button"
                disabled={userMeta.page <= 1}
                onClick={() => setUserFilter("page", userMeta.page - 1)}
              >
                ← Sebelumnya
              </button>
              <span>
                Halaman {userMeta.page} dari {userMeta.totalPages}
              </span>
              <button
                type="button"
                disabled={userMeta.page >= userMeta.totalPages}
                onClick={() => setUserFilter("page", userMeta.page + 1)}
              >
                Berikutnya →
              </button>
            </div>
          </section>
        )}

        {tab === "feedback" && (
          <section className="management">
            <header style={{ marginBottom: "15px" }}>
              <h2>Feedback User</h2>
              <select
                value={feedbackFilter}
                onChange={(e) => {
                  setFeedbackFilter(e.target.value);
                  setFeedbackPage(1);
                }}
              >
                <option value="ALL">Semua Rating</option>
                <option value="5">5 Bintang</option>
                <option value="4">4 Bintang</option>
                <option value="3">3 Bintang</option>
                <option value="2">2 Bintang</option>
                <option value="1">1 Bintang</option>
              </select>
            </header>

            {filteredFeedbackList.length ? (
              <>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Pengguna</th>
                      <th>Rating</th>
                      <th>Isi Feedback</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFeedback.map((item) => (
                      <tr key={item.id}>
                        <td>{item.user?.nama || "Anonim"}</td>
                        <td style={{ color: "#fbbf24", fontSize: "16px" }}>
                          {item.rating ? "★".repeat(item.rating) : "-"}
                        </td>
                        <td>{item.isi}</td>
                        <td>
                          {new Date(item.tanggalKirim).toLocaleDateString(
                            "id-ID",
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination">
                  <button
                    onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
                    disabled={feedbackPage === 1}
                  >
                    Prev
                  </button>
                  <span>
                    Halaman {feedbackPage} dari {totalFeedbackPages}
                  </span>
                  <button
                    onClick={() =>
                      setFeedbackPage((p) =>
                        Math.min(totalFeedbackPages, p + 1),
                      )
                    }
                    disabled={feedbackPage === totalFeedbackPages}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <p>Belum ada feedback untuk filter ini.</p>
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

        {resetResult && (
          <div className="admin-modal">
            <form onSubmit={(e) => e.preventDefault()}>
              <button type="button" onClick={() => setResetResult(null)}>
                ×
              </button>
              <h2>Password direset</h2>
              <p className="reset-note">
                Berikan password sementara ini kepada {resetResult.nama}.
                Password hanya ditampilkan sekali. Minta pengguna segera
                menggantinya melalui Pengaturan &gt; Ubah Kata Sandi.
              </p>
              <code className="temp-password">{resetResult.password}</code>
              <div className="reset-actions">
                <button
                  type="button"
                  className="save"
                  onClick={copyResetPassword}
                >
                  Salin password
                </button>
                <button
                  type="button"
                  className="save secondary"
                  onClick={() => setResetResult(null)}
                >
                  Selesai
                </button>
              </div>
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
