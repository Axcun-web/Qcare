import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api, firstErrorMessage } from "../../lib/api";
import "./ubahNama.css";

const UbahNama = () => {
  const { user, refreshUser } = useAuth();
  const [nama, setNama] = useState(user?.nama ?? "");
  const [konfirmasiNama, setKonfirmasiNama] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (nama.trim() !== konfirmasiNama.trim()) {
      setErrorMessage("Nama dan konfirmasi nama tidak sama.");
      return;
    }

    setIsSaving(true);
    try {
      await api("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ nama, konfirmasiNama }),
      });
      await refreshUser();
      setSuccessMessage("Nama berhasil diubah.");
      setTimeout(() => navigate("/settings"), 1200);
    } catch (error) {
      setErrorMessage(firstErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ubah-nama-page">
      <div className="ubah-nama-card">
        {/* Top bar khusus untuk Back Button */}
        <div className="ubah-nama-topbar">
          <button
            type="button"
            className="ubah-nama-back"
            onClick={() => navigate("/settings")}
            aria-label="Kembali ke Halaman Sebelumnya"
          >
            <span className="back-arrow">←</span>
          </button>
        </div>

        {/* Bagian Header & Logo */}
        <div className="ubah-nama-header">
          <h1 className="qcare-logo">Qcare</h1>
          <p className="qcare-subtitle">Queue Management System</p>
        </div>

        {/* Bagian Judul Form */}
        <div className="ubah-nama-title-section">
          <h2>Ubah Nama</h2>
          <p>Masukkan nama baru Anda di bawah ini</p>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="ubah-nama-form">
          <div className="form-group">
            <label htmlFor="nama">Masukkan Nama</label>
            <input
              type="text"
              id="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Masukkan nama lengkap"
              minLength={3}
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="konfirmasiNama">Konfirmasi Nama</label>
            <input
              type="text"
              id="konfirmasiNama"
              value={konfirmasiNama}
              onChange={(e) => setKonfirmasiNama(e.target.value)}
              placeholder="Masukkan kembali nama lengkap"
              required
            />
          </div>

          {errorMessage && (
            <p className="form-message error" role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="form-message success" role="status">
              {successMessage}
            </p>
          )}

          <button type="submit" className="btn-submit" disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Konfirmasi"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UbahNama;
