import "./ForgotPassword.css";
import { Link } from "react-router-dom";

/**
 * The thesis has no self-service password reset (no Lupa Password use case);
 * the Super Admin resets passwords (Tabel 3.19). This page tells the user how
 * to get a temporary password instead of pretending to send a reset link.
 */
function ForgotPassword() {
  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <div className="logo-section">
          <h1>Qcare</h1>
          <p>Queue Management System</p>
        </div>

        <div className="form-section">
          <h2>Lupa Password</h2>
          <p className="description">
            Untuk mengatur ulang password, hubungi petugas atau admin klinik
            Anda. Admin akan memberikan password sementara.
          </p>
          <ol className="forgot-steps">
            <li>Sampaikan email akun Anda kepada petugas atau admin klinik.</li>
            <li>Login memakai password sementara dari admin.</li>
            <li>
              Segera ganti password melalui Pengaturan &gt; Ubah Kata Sandi.
            </li>
          </ol>

          <Link to="/login" className="send-btn forgot-back-btn">
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
