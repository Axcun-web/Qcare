import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "./Feedback.css";

const Feedback = () => {
  const navigate = useNavigate();
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (feedbackText.trim() === "" || rating === 0) {
      setErrorMsg("Harap isi rating dan masukan.");
      return;
    }
    
    setIsLoading(true);
    setErrorMsg("");

    try {
      await api("/feedback", {
        method: "POST",
        body: JSON.stringify({ isi: feedbackText, rating }),
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      setErrorMsg(error.message || "Gagal mengirim feedback, silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
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
            <div className="form-group rating-group">
              <label>Penilaian Anda</label>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${star <= (hoverRating || rating) ? "active" : ""}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="feedbackText">Masukan Anda</label>
              <textarea
                id="feedbackText"
                rows="5"
                placeholder="Tuliskan saran, keluhan, atau pengalaman Anda menggunakan QCare..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {errorMsg && <p className="error-message" style={{color: 'red', marginBottom: '1rem'}}>{errorMsg}</p>}

            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? "Mengirim..." : "Kirim Masukan"}
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