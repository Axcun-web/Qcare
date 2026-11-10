import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, firstErrorMessage } from "../../lib/api";
import "./ubahPassword.css";

// Same rule as registration on the backend (auth.validator.js).
const MIN_PASSWORD_LENGTH = 8;

const UbahPassword = () => {
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (passwordBaru.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }

    if (passwordBaru !== konfirmasiPassword) {
      setErrorMessage("Password baru dan konfirmasi password tidak sama.");
      return;
    }

    setIsSaving(true);
    try {
      await api("/auth/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          passwordLama,
          passwordBaru,
          konfirmasiPassword,
        }),
      });
      setPasswordLama("");
      setPasswordBaru("");
      setKonfirmasiPassword("");
      setSuccessMessage("Password berhasil diubah.");
      setTimeout(() => navigate("/settings"), 1200);
    } catch (error) {
      setErrorMessage(firstErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ubah-password-page">
      <div className="ubah-password-card">
        {/* Top bar khusus untuk Back Button */}
        <div className="ubah-password-topbar">
          <button
            type="button"
            className="ubah-password-back"
            onClick={() => navigate("/settings")}
            aria-label="Kembali ke Halaman Sebelumnya"
          >
            <span className="back-arrow">←</span>
          </button>
        </div>

        {/* Bagian Header & Logo */}
        <div className="ubah-password-header">
          <h1 className="qcare-logo">Qcare</h1>
          <p className="qcare-subtitle">Queue Management System</p>
        </div>

        {/* Bagian Judul Form */}
        <div className="ubah-password-title-section">
          <h2>Ubah Password</h2>
          <p>Masukkan password lama dan password baru Anda</p>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="ubah-password-form">
          <div className="form-group">
            <label htmlFor="passwordLama">Password Lama</label>
            <input
              type="password"
              id="passwordLama"
              value={passwordLama}
              onChange={(e) => setPasswordLama(e.target.value)}
              placeholder="Masukkan password lama"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordBaru">Password Baru</label>
            <input
              type="password"
              id="passwordBaru"
              value={passwordBaru}
              onChange={(e) => setPasswordBaru(e.target.value)}
              placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter`}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="konfirmasiPassword">Konfirmasi Password Baru</label>
            <input
              type="password"
              id="konfirmasiPassword"
              value={konfirmasiPassword}
              onChange={(e) => setKonfirmasiPassword(e.target.value)}
              placeholder="Masukkan kembali password baru"
              autoComplete="new-password"
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

export default UbahPassword;
