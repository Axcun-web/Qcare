import "./Login.css";
import { Link } from "react-router-dom";
import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  

  const [emailError, setEmailError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault(); 


    if (!email.endsWith("@gmail.com")) {
      setEmailError("Gunakan @gmail.com"); 
      return; 
    }

    
    setEmailError("");
    
    
    console.log("Validasi lolos, mengirim data ke backend:", { email, password });
  };

 
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(""); 
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-section">
          <h1>Qcare</h1>
          <p>Queue Management System</p>
        </div>

        <form className="form-section" onSubmit={handleLogin} noValidate>
          <h2>Selamat Datang</h2>
          <p className="welcome-text">Silakan login untuk melanjutkan</p>

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
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="forgot-password">
            <Link to="/forgot-password">Lupa Password?</Link>
          </div>

          <button type="submit" className="login-btn">
            Login
          </button>

          <div className="register-link">
            Belum memiliki akun? <Link to="/register">Daftar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;