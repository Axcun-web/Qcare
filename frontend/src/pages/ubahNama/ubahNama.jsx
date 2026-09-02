import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ubahNama.css';

const UbahNama = () => {
  const [nama, setNama] = useState('');
  const [konfirmasiNama, setKonfirmasiNama] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (nama !== konfirmasiNama) {
      alert('Nama dan konfirmasi nama tidak cocok.');
      return;
    }

    console.log('Nama baru berhasil disimpan:', nama);
    navigate('/settings');
  };

  return (
    <div className="ubah-nama-page">
      <div className="ubah-nama-card">
        
        {/* Top bar khusus untuk Back Button */}
        <div className="ubah-nama-topbar">
          <button
            type="button"
            className="ubah-nama-back"
            onClick={() => navigate('/settings')}
            aria-label="Kembali ke Settings"
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

          <button type="submit" className="btn-submit">
            Konfirmasi
          </button>
        </form>
      </div>
    </div>
  );
};

export default UbahNama;