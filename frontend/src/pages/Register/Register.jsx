import "./Register.css";
import { Link } from "react-router-dom";
import { useState } from "react";

function Register() {
  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleRegister = (e) => {
    e.preventDefault(); 

    let isValid = true; 


    if (!email.endsWith("@gmail.com")) {
      setEmailError("Gunakan @gmail.com");
      isValid = false;
    }

    if (password !== confirmPassword) {
      setPasswordError("Password tidak cocok");
      isValid = false;
    }

    if (!isValid) return;

    setEmailError("");
    setPasswordError("");

    console.log("Data siap dikirim ke backend:", {
      namaLengkap,
      email,
      password,
    });
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError("");
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (passwordError) setPasswordError("");
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="logo-section">
          <h1>Qcare</h1>
          <p>Queue Management System</p>
        </div>

        <form className="form-section" onSubmit={handleRegister} noValidate>
          <h2>Buat Akun</h2>
          <p className="welcome-text">
            Lengkapi data berikut untuk membuat akun
          </p>

          <div className="input-group">
            <label>Nama Lengkap</label>
            <input
              type="text"
              placeholder="Masukkan nama lengkap"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <label style={{ marginBottom: "0" }}>Email</label>
              {emailError && (
                <span className="email-error-message">*{emailError}</span>
              )}
            </div>
            <input
              type="email"
              placeholder="Masukkan email"
              value={email}
              onChange={handleEmailChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div className="input-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <label style={{ marginBottom: "0" }}>Konfirmasi Password</label>
              {passwordError && (
                <span className="email-error-message">*{passwordError}</span>
              )}
            </div>
            <input
              type="password"
              placeholder="Masukkan kembali password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
            />
          </div>

          <button type="submit" className="register-btn">
            Daftar
          </button>

          <div className="login-link">
            Sudah memiliki akun? <Link to="/">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;