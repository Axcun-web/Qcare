import "./Register.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function Register() {
  const navigate = useNavigate(); 
  
  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false); 

  const handleRegister = async (e) => { 
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

    if (password.length < 8){
      setPasswordError("Password minimal 8 karakter")
      isValid = false;
    }

    if (!isValid) return;

    setEmailError("");
    setPasswordError("");
    setServerError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: namaLengkap,
          email: email,
          password: password,
          konfirmasiPassword: confirmPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal melakukan registrasi");
      }

      alert("Registrasi berhasil! Silakan login.");
      navigate("/"); 

    } catch (error) {
      setServerError(error.message);
    } finally {
      setIsLoading(false);
    }
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

          {serverError && (
            <div style={{ color: "red", marginBottom: "15px", fontSize: "14px", backgroundColor: "#ffe6e6", padding: "10px", borderRadius: "5px" }}>
              {serverError}
            </div>
          )}

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
                <span className="email-error-message" style={{ color: "red", fontSize: "12px" }}>*{emailError}</span>
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
                <span className="email-error-message" style={{ color: "red", fontSize: "12px" }}>*{passwordError}</span>
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

          <button type="submit" className="register-btn" disabled={isLoading}>
            {isLoading ? <span className="spinner"></span> : "Daftar"}
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