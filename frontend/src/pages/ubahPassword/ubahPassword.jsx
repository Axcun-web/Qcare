import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ubahPassword.css';

const UbahPassword = () => {
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validasi sederhana
    if (passwordBaru !== konfirmasiPassword) {
      alert('Password baru dan konfirmasi password tidak cocok.');
      return;
    }

    if (passwordBaru.length < 6) {
      alert('Password baru minimal harus 6 karakter.');
      return;
    }

    console.log('Password berhasil diubah!');
    
    // Kembali ke page settings setelah berhasil
    navigate('/settings');
  };

  return (
    <div className="ubah-password-page">
      <div className="ubah-password-card">
        
        {/* Top bar khusus untuk Back Button */}
        <div className="ubah-password-topbar">
          <button
            type="button"
            className="ubah-password-back"
            onClick={() => navigate('/settings')}
            aria-label="Kembali ke Settings"
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
              placeholder="Masukkan password baru"
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
              required
            />
          </div>

          <button type="submit" className="btn-submit">
            Konfirmasi
          </button>
        </form>
      </div>
    </div>
  );
};

export default UbahPassword;