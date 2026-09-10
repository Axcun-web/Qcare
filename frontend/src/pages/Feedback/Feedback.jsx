import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Feedback.css";

const Feedback = () => {
  const navigate = useNavigate();
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (feedbackText.trim() === "") return;
    setIsSubmitted(true);
  };

  return (
    <div className="feedback-page">
      <div className="feedback-card">
        {/* TOMBOL BACK */}
        <div className="feedback-topbar">
          <button 
            className="back-button" 
            onClick={() => navigate("/settings")}
            aria-label="Kembali ke Pengaturan"
          >
            <span className="back-arrow">←</span>
          </button>
        </div>

        {/* HEADER & LOGO */}
        <div className="feedback-header">
          <h1 className="qcare-logo">QCare</h1>
          <p className="qcare-subtitle">Beri Masukan & Saran</p>
        </div>

        {/* FORM / PESAN SUKSES */}
        {!isSubmitted ? (
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="feedbackText">Masukan Anda</label>
              <textarea
                id="feedbackText"
                rows="5"
                placeholder="Tuliskan saran, keluhan, atau pengalaman Anda menggunakan QCare..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-submit">
              Kirim Masukan
            </button>
          </form>
        ) : (
          <div className="success-box">
            <div className="success-icon">✓</div>
            <h2>Terima kasih untuk masukannya!</h2>
            <p>Masukan Anda sangat berharga untuk pengembangan layanan QCare ke depannya.</p>
            <button 
              className="btn-submit" 
              onClick={() => navigate("/settings")}
            >
              Kembali ke Pengaturan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;