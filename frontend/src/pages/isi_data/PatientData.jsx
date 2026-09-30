import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import PatientNavbar from "../../components/PatientNavbar";
import { useAuth } from "../../context/AuthContext";
import "./PatientData.css";

const PatientData = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [registerFor, setRegisterFor] = useState("self");
  const [doctorsList, setDoctorsList] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [savedPatients, setSavedPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isAddingNewPerson, setIsAddingNewPerson] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    clinicId: "",
    category: "",
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
        const [docsRes, patientsRes] = await Promise.all([
          api("/queues/doctors"),
          api("/queues/patients")
        ]);

        if (docsRes.success) {
          const docs = docsRes.data || [];
          setDoctorsList(docs);

          const uniqueClinicsMap = {};
          docs.forEach((doc) => {
            if (doc.clinic && !uniqueClinicsMap[doc.clinic.id]) {
              uniqueClinicsMap[doc.clinic.id] = doc.clinic;
            }
          });
          setClinics(Object.values(uniqueClinicsMap));
        }

        if (patientsRes && patientsRes.success) {
          setSavedPatients(patientsRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Gagal memuat data awal.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [user]);

  // Scroll to top when there is an error
  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [error]);

  const handleSelectPatient = (patient) => {
    if (!patient) {
      setFormData(prev => ({
        ...prev,
        name: registerFor === "self" ? (user?.nama || "") : "",
        birthDate: "",
        birthPlace: "",
        gender: ""
      }));
      return;
    }
    
    // Format date to YYYY-MM-DD for input
    const d = new Date(patient.tanggalLahir);
    const dateStr = d.toISOString().split('T')[0];

    setFormData(prev => ({
      ...prev,
      name: patient.nama,
      birthDate: dateStr,
      birthPlace: patient.tempatLahir || "",
      gender: patient.jenisKelamin === "Laki-laki" ? "male" : "female"
    }));
  };

  useEffect(() => {
    if (registerFor === "self") {
      setIsAddingNewPerson(false);
      const selfPatient = savedPatients.find(p => p.hubungan === "Diri sendiri");
      if (selfPatient) {
        setSelectedPatientId(selfPatient.id.toString());
        handleSelectPatient(selfPatient);
      } else {
        setSelectedPatientId("");
        handleSelectPatient(null);
      }
    } else {
      // Switched to other
      setSelectedPatientId("");
      handleSelectPatient(null);
      setIsAddingNewPerson(false);
    }
  }, [registerFor, savedPatients, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "clinicId") {
        const docsForClinic = doctorsList.filter((doc) => 
          doc.clinic?.id?.toString() === value || doc.clinicId?.toString() === value
        );
        
        // Ambil daftar spesialisasi/kategori dokter yang unik di klinik ini
        const categories = Array.from(
          new Set(docsForClinic.map((doc) => doc.spesialisasi).filter(Boolean))
        );
        setAvailableCategories(categories);

        setFilteredDoctors([]);
        updated.category = "";
        updated.doctorId = "";
        updated.jadwalId = "";
        setAvailableSchedules([]);
      }

      if (name === "category") {
        const docsForClinicAndCategory = doctorsList.filter(
          (doc) =>
            (doc.clinic?.id?.toString() === prev.clinicId || doc.clinicId?.toString() === prev.clinicId) &&
            doc.spesialisasi === value
        );
        setFilteredDoctors(docsForClinicAndCategory);
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
      const payload = {
        clinicId: Number(formData.clinicId),
        doctorId: Number(formData.doctorId),
        jadwalId: Number(formData.jadwalId),
        keluhanUtama: formData.complaint === "lainnya" ? formData.otherComplaint : formData.complaint,
        registerFor: registerFor,
        name: formData.name,
        birthDate: formData.birthDate,
        birthPlace: formData.birthPlace,
        gender: formData.gender === "male" ? "Laki-laki" : "Perempuan",
        patientId: selectedPatientId ? Number(selectedPatientId) : undefined,
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
      <PatientNavbar />

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

        {error && (
          <div className="error-alert" style={{ 
            backgroundColor: '#fef2f2', 
            color: '#991b1b', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '24px', 
            border: '1px solid #f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <form className="patient-form-card" onSubmit={handleSubmit}>
          {/* INFORMASI KUNJUNGAN */}
          <div className="section-title">
            <h2>Informasi Kunjungan</h2>
            <p>Pilih klinik, dokter, dan keluhan Anda.</p>
          </div>

          {/* 1. LOKASI KLINIK */}
          <div className="form-group">
            <label htmlFor="clinicId">Pilih Lokasi Klinik *</label>
            <div className="select-wrapper">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4M9 7h6M9 11h6" /></svg>
              </span>
              <select id="clinicId" name="clinicId" value={formData.clinicId} onChange={handleChange} required disabled={loading}>
                <option value="">{loading ? "Memuat data klinik..." : "Pilih lokasi klinik"}</option>
                {clinics.map((clinic, idx) => (
                  <option key={clinic.id || `clinic-${idx}`} value={clinic.id}>{clinic.nama} {clinic.alamat ? `- ${clinic.alamat}` : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. KATEGORI DOKTER */}
          <div className="form-group">
            <label htmlFor="category">Pilih Kategori Dokter *</label>
            <div className="select-wrapper">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49 0 2.87.47 4 1.26V8c0-1.1-.9-2-2-2h-4V4c0-1.1-.9-2-2-2h-6c-1.1 0-2 .9-2 2v2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h8.26c-.16-.64-.26-1.31-.26-2 0-4.42 3.58-8 8-8zm-5-8h-4V4h4v2z"/></svg>
              </span>
              <select 
                id="category" 
                name="category" 
                value={formData.category} 
                onChange={handleChange} 
                required 
                disabled={!formData.clinicId}
              >
                <option value="">
                  {formData.clinicId ? "Pilih kategori dokter" : "Pilih klinik terlebih dahulu"}
                </option>
                {availableCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. PILIH DOKTER */}
          <div className="form-group">
            <label htmlFor="doctorId">Pilih Dokter *</label>
            <div className="select-wrapper">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </span>
              <select 
                id="doctorId" 
                name="doctorId" 
                value={formData.doctorId} 
                onChange={handleChange} 
                required 
                disabled={!formData.category}
              >
                <option value="">
                  {!formData.clinicId 
                    ? "Pilih klinik terlebih dahulu" 
                    : !formData.category 
                    ? "Pilih kategori dokter terlebih dahulu" 
                    : "Pilih dokter"}
                </option>
                {filteredDoctors.map((doc, idx) => (
                  <option key={doc.id || `doc-${idx}`} value={doc.id}>{doc.nama} ({doc.spesialisasi})</option>
                ))}
              </select>
            </div>
          </div>

          {/* JADWAL PRAKTIK */}
          {availableSchedules.length > 0 && (
            <div className="form-group">
              <label htmlFor="jadwalId">Jadwal Praktik *</label>
              <div className="select-wrapper">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
                <select id="jadwalId" name="jadwalId" value={formData.jadwalId} onChange={handleChange} required>
                  {availableSchedules.map((j, idx) => (
                    <option key={j.id || `schedule-${idx}`} value={j.id}>
                      {j.hari.charAt(0).toUpperCase() + j.hari.slice(1).toLowerCase()} ({new Date(j.jamMulai).toLocaleTimeString('id-ID', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit' })} - {new Date(j.jamSelesai).toLocaleTimeString('id-ID', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit' })})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* KELUHAN UTAMA */}
          <div className="form-group">
            <label htmlFor="complaint">Keluhan Utama *</label>
            <div className="select-wrapper">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </span>
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
                <span className="field-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </span>
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

          {registerFor === "other" && (
            <div className="form-group">
              <label>Pilih Data Pasien</label>
              <div className="select-wrapper">
                <select 
                  value={isAddingNewPerson ? "new" : selectedPatientId} 
                  onChange={(e) => {
                    if (e.target.value === "new") {
                      setIsAddingNewPerson(true);
                      setSelectedPatientId("");
                      handleSelectPatient(null);
                    } else {
                      setIsAddingNewPerson(false);
                      setSelectedPatientId(e.target.value);
                      handleSelectPatient(savedPatients.find(p => p.id.toString() === e.target.value));
                    }
                  }}
                  required
                >
                  <option value="" disabled>Pilih Pasien yang sudah ada...</option>
                  {savedPatients.filter(p => p.hubungan !== "Diri sendiri").map(p => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                  <option value="new">+ Tambah Orang Baru</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Masukkan Nama (sesuai KTP) *</label>
            <div className="input-wrapper">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Masukkan nama lengkap" required />
            </div>
          </div>

          <div className="form-group">
            <label>Tanggal dan Tempat Lahir *</label>
            <div className="birth-wrapper">
              <div className="birth-field">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
                <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} required />
              </div>
              <div className="birth-field">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </span>
                <input type="text" name="birthPlace" value={formData.birthPlace} onChange={handleChange} placeholder="Tempat lahir" required />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gender">Jenis Kelamin *</label>
            <div className="select-wrapper">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M12 11v11"/><path d="M8 15h8"/><path d="M16 3l5 5"/><path d="M21 3h-5"/><path d="M21 3v5"/></svg>
              </span>
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