import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./PatientData.css";

const PatientData = () => {
  const [registerFor, setRegisterFor] = useState("self");

  const [formData, setFormData] = useState({
    location: "",
    doctor: "",
    complaint: "",
    name: "",
    birthDate: "",
    birthPlace: "",
    gender: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log({
      registerFor,
      ...formData,
    });
  };

  return (
    <div className="patient-page">

      {/* HEADER */}
      <header className="patient-header">

        <Link to="/" className="back-button">
          ←
        </Link>

        <Link to="/" className="patient-logo">
          QCare
        </Link>

      </header>


      {/* MAIN */}
      <main className="patient-main">

        {/* HEADING */}
        <div className="patient-heading">

          <div className="heading-content">

            <span className="heading-label">
              PENGAMBILAN ANTRIAN
            </span>

            <h1>
              Isi Data Pasien
            </h1>

            <p>
              Lengkapi data berikut untuk mengambil nomor antrian.
            </p>

          </div>


          {/* INFORMATION BOX */}
          <div className="information-box">

            <div className="info-icon">
              i
            </div>

            <p>
              Data yang Anda masukkan akan digunakan
              untuk keperluan pelayanan di klinik.
            </p>

          </div>

        </div>


        {/* FORM */}
        <form
          className="patient-form-card"
          onSubmit={handleSubmit}
        >

          {/* INFORMASI KUNJUNGAN */}
          <div className="section-title">

            <h2>
              Informasi Kunjungan
            </h2>

            <p>
              Pilih klinik, dokter, dan keluhan Anda.
            </p>

          </div>


          {/* LOCATION */}
          <div className="form-group">

            <label htmlFor="location">
              Pilih Lokasi
            </label>

            <div className="select-wrapper">

              <span className="field-icon">
                ⌖
              </span>

              <select
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              >

                <option value="">
                  Pilih lokasi klinik
                </option>

                <option value="klinik-utama">
                  Klinik Utama Sehat
                </option>

                <option value="klinik-medika">
                  Klinik Medika
                </option>

              </select>

            </div>

          </div>


          {/* DOCTOR */}
          <div className="form-group">

            <label htmlFor="doctor">
              Pilih Dokter
            </label>

            <div className="select-wrapper">

              <span className="field-icon">
                ♙
              </span>

              <select
                id="doctor"
                name="doctor"
                value={formData.doctor}
                onChange={handleChange}
                required
              >

                <option value="">
                  Pilih dokter
                </option>

                <option value="dr-jane">
                  Dr. Jane Doe
                </option>

                <option value="dr-john">
                  Dr. John Doe
                </option>

              </select>

            </div>

          </div>


          {/* COMPLAINT */}
          <div className="form-group">

            <label htmlFor="complaint">
              Keluhan
            </label>

            <div className="select-wrapper">

              <span className="field-icon">
                ▢
              </span>

              <select
                id="complaint"
                name="complaint"
                value={formData.complaint}
                onChange={handleChange}
                required
              >

                <option value="">
                  Pilih keluhan utama
                </option>

                <option value="demam">
                  Demam
                </option>

                <option value="batuk">
                  Batuk
                </option>

                <option value="sakit-kepala">
                  Sakit kepala
                </option>

                <option value="lainnya">
                  Lainnya
                </option>

              </select>

            </div>

          </div>


          <div className="form-divider"></div>


          {/*  DATA PASIEN */}
          <div className="section-title">

            <h2>
              Data Pasien
            </h2>

            <p>
              Masukkan informasi pasien sesuai identitas.
            </p>

          </div>


          {/* REGISTER FOR */}
          <div className="form-group">

            <label>
              Apakah Anda mendaftar untuk diri sendiri
              atau untuk orang lain?
            </label>

            <div className="register-options">

              {/* DIRI SENDIRI */}
              <label
                className={`register-option ${
                  registerFor === "self"
                    ? "selected"
                    : ""
                }`}
              >

                <input
                  type="radio"
                  name="registerFor"
                  value="self"
                  checked={registerFor === "self"}
                  onChange={() =>
                    setRegisterFor("self")
                  }
                />

                <div className="custom-radio">
                  <div className="radio-dot"></div>
                </div>

                <div className="register-content">

                  <strong>
                    Diri sendiri
                  </strong>

                  <span>
                    Mendaftar untuk diri sendiri
                  </span>

                </div>

              </label>


              {/* ORANG LAIN */}
              <label
                className={`register-option ${
                  registerFor === "other"
                    ? "selected"
                    : ""
                }`}
              >

                <input
                  type="radio"
                  name="registerFor"
                  value="other"
                  checked={registerFor === "other"}
                  onChange={() =>
                    setRegisterFor("other")
                  }
                />

                <div className="custom-radio">
                  <div className="radio-dot"></div>
                </div>

                <div className="register-content">

                  <strong>
                    Orang lain
                  </strong>

                  <span>
                    Mendaftar untuk orang lain
                  </span>

                </div>

              </label>

            </div>

          </div>


          {/* NAME */}
          <div className="form-group">

            <label htmlFor="name">
              Masukkan Nama (sesuai KTP) *
            </label>

            <div className="input-wrapper">

              <span className="field-icon">
                ♙
              </span>

              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Masukkan nama lengkap"
                required
              />

            </div>

          </div>


          {/* BIRTH */}
          <div className="form-group">

            <label>
              Tanggal dan Tempat Lahir *
            </label>

            <div className="birth-wrapper">

              {/* DATE */}
              <div className="birth-field">

                <span className="field-icon">
                  ▣
                </span>

                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                />

              </div>


              {/* PLACE */}
              <div className="birth-field">

                <span className="field-icon">
                  ⌖
                </span>

                <input
                  type="text"
                  name="birthPlace"
                  value={formData.birthPlace}
                  onChange={handleChange}
                  placeholder="Tempat lahir"
                  required
                />

              </div>

            </div>

          </div>


          {/* GENDER */}
          <div className="form-group">

            <label htmlFor="gender">
              Gender *
            </label>

            <div className="select-wrapper">

              <span className="field-icon">
                ♙
              </span>

              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >

                <option value="">
                  Pilih gender
                </option>

                <option value="male">
                  Laki-laki
                </option>

                <option value="female">
                  Perempuan
                </option>

              </select>

            </div>

          </div>


          {/*SUBMIT*/}
          <button
            type="submit"
            className="queue-button"
          >

            <span>+</span>

            Ambil Nomor Antrian

          </button>


          {/* SECURITY */}
          <div className="data-security">

            <span>✓</span>

            Data Anda aman dan hanya digunakan
            untuk keperluan pelayanan.

          </div>

        </form>

      </main>

    </div>
  );
};

export default PatientData;