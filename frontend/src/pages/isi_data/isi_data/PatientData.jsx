import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "./PatientData.css";

const PatientData = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false); 

  const [registerFor, setRegisterFor] = useState("self");
  const [doctorsList, setDoctorsList] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [availableSchedules, setAvailableSchedules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    clinicId: "",
    doctorId: "",
    jadwalId: "",
    complaint: "",
    otherComplaint: "",
    name: "",
    birthDate: "",
    birthPlace: "",
    gender: "",
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const res = await api("/queues/doctors");
        if (res.success) {
          const docs = res.data || [];
          setDoctorsList(docs);

          const uniqueClinicsMap = {};
          docs.forEach((doc) => {
            if (doc.clinic && !uniqueClinicsMap[doc.clinic.id]) {
              uniqueClinicsMap[doc.clinic.id] = doc.clinic;
            }
          });
          setClinics(Object.values(uniqueClinicsMap));
        }
      } catch (err) {
        console.error("Failed to load doctors/clinics:", err);
        setError("Gagal memuat data klinik dan dokter.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "clinicId") {
        const docsForClinic = doctorsList.filter((doc) => doc.clinicId.toString() === value);
        setFilteredDoctors(docsForClinic);
        updated.doctorId = "";
        updated.jadwalId = "";
        setAvailableSchedules([]);
      }

      if (name === "doctorId") {
        const selectedDoc = filteredDoctors.find((doc) => doc.id.toString() === value);
        const schedules = selectedDoc?.jadwalPraktik || [];
        setAvailableSchedules(schedules);
        updated.jadwalId = schedules.length > 0 ? schedules[0].id.toString() : "";
      }

      if (name === "complaint" && value !== "lainnya") {
        updated.otherComplaint = "";
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      const finalComplaint = formData.complaint === "lainnya" ? formData.otherComplaint : formData.complaint;
      const payload = {
        clinicId: formData.clinicId,
        doctorId: formData.doctorId,
        jadwalId: formData.jadwalId,
        complaint: finalComplaint,
        registerFor,
        name: formData.name,
        birthDate: formData.birthDate,
        birthPlace: formData.birthPlace,
        gender: formData.gender === "male" ? "Laki-laki" : "Perempuan",
      };

      const response = await api("/queues", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.success) {
        navigate("/patient");
      }
    } catch (err) {
      console.error("Failed to submit queue:", err);
      setError(err.message || "Gagal mengambil nomor antrean.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="patient-page">
      {/* NAVBAR BARU */}
      <header className="dashboard-header">
        <Link to="/patient" className="logo">QCare</Link>
        <nav className="header-nav">
          <Link to="/patient" className="nav-link">Dashboard</Link>
          <Link to="/clinics" className="nav-link">Klinik</Link>
          <Link to="/appointments" className="nav-link active">Janji Temu</Link>
          <Link to="/history" className="nav-link">Riwayat</Link>
        </nav>
        <div className="header-right">
          <div className="profile-wrapper">
            <div className="profile-pic" onClick={() => setShowProfileMenu((prev) => !prev)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            {showProfileMenu && (
              <div className="profile-dropdown">
                <button type="button" onClick={() => { setShowProfileMenu(false); navigate("/settings"); }}>
                  Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="patient-main">
        <div className="patient-heading">
          <div className="heading-content">
            <span className="heading-label">PENGAMBILAN ANTREAN</span>
            <h1>Isi Data Pasien</h1>
            <p>Lengkapi data berikut untuk mengambil nomor antrean.</p>
          </div>
          <div className="information-box">
            <div className="info-icon">i</div>
            <p>Data yang Anda masukkan akan digunakan untuk keperluan pelayanan di klinik.</p>
          </div>
        </div>

        {error && <div className="error-state" style={{ color: "red", marginBottom: "20px" }}>{error}</div>}

        <form className="patient-form-card" onSubmit={handleSubmit}>
          {/* INFORMASI KUNJUNGAN */}
          <div className="section-title">
            <h2>Informasi Kunjungan</h2>
            <p>Pilih klinik, dokter, dan keluhan Anda.</p>
          </div>

          <div className="form-group">
            <label htmlFor="clinicId">Pilih Lokasi Klinik *</label>
            <div className="select-wrapper">
              <span className="field-icon">⌖</span>
              <select id="clinicId" name="clinicId" value={formData.clinicId} onChange={handleChange} required disabled={loading}>
                <option value="">{loading ? "Memuat data klinik..." : "Pilih lokasi klinik"}</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>{clinic.nama} - {clinic.alamat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="doctorId">Pilih Dokter *</label>
            <div className="select-wrapper">
              <span className="field-icon">♙</span>
              <select id="doctorId" name="doctorId" value={formData.doctorId} onChange={handleChange} required disabled={!formData.clinicId}>
                <option value="">{formData.clinicId ? "Pilih dokter" : "Pilih klinik terlebih dahulu"}</option>
                {filteredDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.nama} ({doc.spesialisasi})</option>
                ))}
              </select>
            </div>
          </div>

          {availableSchedules.length > 0 && (
            <div className="form-group">
              <label htmlFor="jadwalId">Jadwal Praktik *</label>
              <div className="select-wrapper">
                <span className="field-icon">⏱</span>
                <select id="jadwalId" name="jadwalId" value={formData.jadwalId} onChange={handleChange} required>
                  {availableSchedules.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.hari} ({new Date(j.jamMulai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(j.jamSelesai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="complaint">Keluhan Utama *</label>
            <div className="select-wrapper">
              <span className="field-icon">▢</span>
              <select id="complaint" name="complaint" value={formData.complaint} onChange={handleChange} required>
                <option value="">Pilih keluhan utama</option>
                <option value="Demam">Demam</option>
                <option value="Batuk">Batuk & Pilek</option>
                <option value="Sakit Kepala">Sakit kepala</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            {formData.complaint === "lainnya" && (
              <div className="input-wrapper other-complaint-input">
                <span className="field-icon">✎</span>
                <input type="text" name="otherComplaint" value={formData.otherComplaint} onChange={handleChange} placeholder="Ketik keluhan Anda di sini..." required />
              </div>
            )}
          </div>

          <div className="form-divider"></div>

          <div className="section-title">
            <h2>Data Pasien</h2>
            <p>Masukkan informasi pasien sesuai identitas.</p>
          </div>

          <div className="form-group">
            <label>Mendaftar untuk siapa?</label>
            <div className="register-options">
              <label className={`register-option ${registerFor === "self" ? "selected" : ""}`}>
                <input type="radio" name="registerFor" value="self" checked={registerFor === "self"} onChange={() => setRegisterFor("self")} />
                <div className="custom-radio"><div className="radio-dot"></div></div>
                <div className="register-content">
                  <strong>Diri sendiri</strong>
                  <span>Mendaftar untuk diri sendiri</span>
                </div>
              </label>
              <label className={`register-option ${registerFor === "other" ? "selected" : ""}`}>
                <input type="radio" name="registerFor" value="other" checked={registerFor === "other"} onChange={() => setRegisterFor("other")} />
                <div className="custom-radio"><div className="radio-dot"></div></div>
                <div className="register-content">
                  <strong>Orang lain</strong>
                  <span>Mendaftar untuk orang lain</span>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="name">Masukkan Nama (sesuai KTP) *</label>
            <div className="input-wrapper">
              <span className="field-icon">♙</span>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Masukkan nama lengkap" required />
            </div>
          </div>

          <div className="form-group">
            <label>Tanggal dan Tempat Lahir *</label>
            <div className="birth-wrapper">
              <div className="birth-field">
                <span className="field-icon">▣</span>
                <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} required />
              </div>
              <div className="birth-field">
                <span className="field-icon">⌖</span>
                <input type="text" name="birthPlace" value={formData.birthPlace} onChange={handleChange} placeholder="Tempat lahir" required />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gender">Jenis Kelamin *</label>
            <div className="select-wrapper">
              <span className="field-icon">♙</span>
              <select id="gender" name="gender" value={formData.gender} onChange={handleChange} required>
                <option value="">Pilih jenis kelamin</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>
          </div>

          <button type="submit" className="queue-button" disabled={submitting}>
            <span>+</span>
            {submitting ? "Memproses..." : "Ambil Nomor Antrean"}
          </button>
        </form>
      </main>
    </div>
  );
};

export default PatientData;