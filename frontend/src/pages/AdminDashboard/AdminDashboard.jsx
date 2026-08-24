import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./AdminDashboard.css";

const emptyClinic = { nama: "", alamat: "", jamOperasional: "", jenisLayanan: "" };

export default function AdminDashboard() { 
  const { user, logout } = useAuth(); 
  const [tab, setTab] = useState("clinics"), 
        [clinics, setClinics] = useState([]), 
        [users, setUsers] = useState([]), 
        [feedback, setFeedback] = useState([]), 
        [editing, setEditing] = useState(null), 
        [detail, setDetail] = useState(null), 
        [message, setMessage] = useState("");

  const load = () => Promise.all([api("/admin/clinics"), api("/admin/users"), api("/admin/feedback")])
    .then(([c,u,f]) => { setClinics(c.data); setUsers(u.data); setFeedback(f.data); })
    .catch(e => setMessage(e.message)); 

  useEffect(() => { load(); }, []); 
  
  useEffect(() => { 
    if (!message) return undefined; 
    const timeout = window.setTimeout(() => setMessage(""), 5000); 
    return () => window.clearTimeout(timeout); 
  }, [message]);

  const submitClinic = async e => { 
    e.preventDefault(); 
    const data = Object.fromEntries(new FormData(e.currentTarget)); 
    try { 
      await api(editing?.id ? `/admin/clinics/${editing.id}` : "/admin/clinics", { 
        method: editing?.id ? "PATCH" : "POST", 
        body: JSON.stringify(data) 
      }); 
      setEditing(null); 
      load(); 
    } catch (err) { setMessage(err.message); } 
  };

  const deleteClinic = async id => { 
    if (!window.confirm("Hapus klinik ini?")) return; 
    try { 
      await api(`/admin/clinics/${id}`, { method: "DELETE" }); 
      load(); 
    } catch (err) { setMessage(err.message); } 
  };

  const addMember = async (e, path) => { 
    e.preventDefault(); 
    const form = e.currentTarget, clinicId = detail.id; 
    try { 
      await api(path, { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }); 
      form.reset(); 
      const refreshed = await api(`/admin/clinics/${clinicId}`); 
      setDetail(refreshed.data); 
      await load(); 
      setMessage("Data berhasil ditambahkan."); 
    } catch (err) { setMessage(err.message); } 
  };

  // --- NEW: Edit/Delete Handlers for Doctors and Staff ---
  const deleteDoctor = async (id) => {
    if (!window.confirm("Hapus dokter ini?")) return;
    try {
      await api(`/admin/doctors/${id}`, { method: "DELETE" });
      const refreshed = await api(`/admin/clinics/${detail.id}`);
      setDetail(refreshed.data);
      load();
    } catch (err) { setMessage(err.message); }
  };

  const editDoctor = async (doc) => {
    const nama = prompt("Nama dokter:", doc.nama);
    const spesialisasi = prompt("Spesialisasi:", doc.spesialisasi);
    if (!nama || !spesialisasi) return;
    try {
      await api(`/admin/doctors/${doc.id}`, { method: "PATCH", body: JSON.stringify({ nama, spesialisasi }) });
      const refreshed = await api(`/admin/clinics/${detail.id}`);
      setDetail(refreshed.data);
      load();
    } catch (err) { setMessage(err.message); }
  };

  const deleteStaff = async (id) => {
    if (!window.confirm("Hapus petugas ini?")) return;
    try {
      await api(`/admin/users/${id}`, { method: "DELETE" });
      const refreshed = await api(`/admin/clinics/${detail.id}`);
      setDetail(refreshed.data);
      load();
    } catch (err) { setMessage(err.message); }
  };

  const editStaff = async (staff) => {
    const nama = prompt("Nama petugas:", staff.nama);
    if (!nama) return;
    try {
      // Existing user update endpoint
      await api(`/admin/users/${staff.id}`, { method: "PATCH", body: JSON.stringify({ nama }) });
      const refreshed = await api(`/admin/clinics/${detail.id}`);
      setDetail(refreshed.data);
      load();
    } catch (err) { setMessage(err.message); }
  };

  const editUser = async (e, item) => { 
    e.preventDefault(); 
    try { 
      const data = Object.fromEntries(new FormData(e.currentTarget)); 
      data.isActive = e.currentTarget.elements.isActive.checked; 
      await api(`/admin/users/${item.id}`, { method: "PATCH", body: JSON.stringify(data) }); 
      load(); 
      setMessage("Data pengguna diperbarui."); 
    } catch (err) { setMessage(err.message); } 
  };

  return (
    <div className="admin-page">
      <header><div><b>QCare</b><small>SUPERADMIN CONSOLE</small></div><div>{user?.nama}<button onClick={logout}>Keluar</button></div></header>
      <main>
        <p className="admin-kicker">MANAJEMEN SISTEM</p><h1>Administrasi QCare</h1>
        <nav className="admin-tabs">{[["clinics","Klinik"],["users","User"],["feedback","Feedback"]].map(([id,name]) => <button className={tab===id?"selected":""} onClick={() => setTab(id)} key={id}>{name}</button>)}</nav>
        
        {tab==="clinics" && <section><div className="admin-action"><div><h2>Daftar klinik</h2><p>Kelola detail, dokter, dan petugas per klinik.</p></div><button onClick={() => setEditing(emptyClinic)}>+ Tambah klinik</button></div><div className="clinic-grid">{clinics.map(c => <article key={c.id}><small>{c.jenisLayanan}</small><h3>{c.nama}</h3><p>{c.alamat}</p><span>◷ {c.jamOperasional}</span><div className="counts">{c._count.doctors} dokter · {c._count.users} petugas</div><footer><button onClick={async () => { setDetail((await api(`/admin/clinics/${c.id}`)).data); }}>Detail</button><button onClick={() => setEditing(c)}>Edit</button><button className="danger" onClick={() => deleteClinic(c.id)}>Hapus</button></footer></article>)}</div></section>}
        
        {tab==="users" && <section className="management"><h2>Edit data user</h2><p>Ubah data akun User di sini.</p>{users.map(item => <form className="edit-user" key={item.id} onSubmit={e => editUser(e,item)}><div><b>{item.nama}</b><small>{item.role}{item.clinic?.nama ? ` · ${item.clinic.nama}` : item.role === "PETUGAS" ? " · Tidak terhubung ke klinik" : ""}</small></div><input name="nama" defaultValue={item.nama}/><input name="email" type="email" defaultValue={item.email}/><input name="noHp" defaultValue={item.noHp ?? ""} placeholder="Nomor HP"/><label className="toggle">Aktif<input name="isActive" type="checkbox" defaultChecked={item.isActive}/></label><button>Simpan</button></form>)}</section>}
        
        {tab==="feedback" && <section className="management"><h2>Feedback User</h2>{feedback.length ? feedback.map(item => <article className="feedback" key={item.id}><b>{item.user.nama}</b><span>{item.rating ? "★".repeat(item.rating) : "Tanpa rating"} · {item.antrean?.clinic?.nama ?? "Kunjungan umum"}</span><p>{item.isi}</p></article>) : <p>Belum ada feedback masuk.</p>}</section>}
        
        {editing && <div className="admin-modal"><form onSubmit={submitClinic}><button type="button" onClick={() => setEditing(null)}>×</button><h2>{editing.id ? "Edit klinik" : "Tambah klinik"}</h2>{Object.entries(emptyClinic).map(([key]) => <label key={key}>{key === "jamOperasional" ? "Jam operasional" : key === "jenisLayanan" ? "Jenis layanan" : key[0].toUpperCase()+key.slice(1)}<input name={key} defaultValue={editing[key]} required/></label>)}<button className="save">Simpan klinik</button></form></div>}
        
        {detail && <div className="admin-modal"><div className="clinic-detail"><button className="modal-close" onClick={() => setDetail(null)}>×</button><p>DETAIL KLINIK</p><h2>{detail.nama}</h2><div className="detail-columns">
          
          <section>
            <h3>Dokter</h3>
            {detail.doctors.map(x => (
              <div className="member" key={x.id}>
                <div>{x.nama}<small>{x.spesialisasi}</small></div>
                <div className="member-actions">
                  <button type="button" onClick={() => editDoctor(x)}>Edit</button>
                  <button type="button" onClick={() => deleteDoctor(x.id)} className="danger">Hapus</button>
                </div>
              </div>
            ))}
            <form onSubmit={e => addMember(e,`/admin/clinics/${detail.id}/doctors`)}>
              <input name="nama" placeholder="Nama dokter" required/>
              <input name="spesialisasi" placeholder="Spesialisasi" required/>
              <button>Tambah dokter</button>
            </form>
          </section>

          <section>
            <h3>Petugas</h3>
            {detail.users.map(x => (
              <div className="member" key={x.id}>
                <div>{x.nama}<small>{x.email}</small></div>
                <div className="member-actions">
                  <button type="button" onClick={() => editStaff(x)}>Edit</button>
                  <button type="button" onClick={() => deleteStaff(x.id)} className="danger">Hapus</button>
                </div>
              </div>
            ))}
            <form onSubmit={e => addMember(e,`/admin/clinics/${detail.id}/staff`)}>
              <input name="nama" placeholder="Nama petugas" required/>
              <input name="email" type="email" placeholder="Email" required/>
              <input name="password" type="password" placeholder="Password awal (min. 8)" minLength="8" required/>
              <input name="noHp" placeholder="Nomor HP"/>
              <button>Tambah petugas</button>
            </form>
          </section>

        </div></div></div>}
        
        {message && <div className="admin-message"><span>{message}</span><button aria-label="Tutup pesan" onClick={() => setMessage("")}>×</button></div>}
      </main>
    </div>
  ); 
}