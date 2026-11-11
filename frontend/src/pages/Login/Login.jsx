import "./Login.css";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, firstErrorMessage } from "../../lib/api";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // Set by lib/api.js when the session ended (token expired or the account
  // was deactivated by the admin).
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState(
    searchParams.get("sesi") === "berakhir"
      ? "Sesi Anda telah berakhir atau akun dinonaktifkan. Silakan login kembali."
      : "",
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    let isValid = true;

    if (!email.includes("@")) {
      setEmailError("Masukkan email yang valid");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (password.trim() === "") {
      setPasswordError("Password wajib diisi");
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (!isValid) return;

    setServerError("");
    setIsLoading(true);

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      login(data.data);
      const role = data.data.user.role;
      navigate(
        role === "SUPERADMIN"
          ? "/admin"
          : role === "PETUGAS"
            ? "/petugas"
            : "/patient",
      );
    } catch (error) {
      setServerError(firstErrorMessage(error));
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

          {serverError && (
            <div
              style={{
                color: "#d9534f",
                marginBottom: "15px",
                fontSize: "14px",
                backgroundColor: "#f9e2e2",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ebccd1",
              }}
            >
              {serverError}
            </div>
          )}

          <div className="input-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "5px",
              }}
            >
              <label style={{ marginBottom: "0" }}>Email</label>
              {emailError && (
                <span
                  className="email-error-message"
                  style={{ color: "red", fontSize: "12px" }}
                >
                  *{emailError}
                </span>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "5px",
              }}
            >
              <label style={{ marginBottom: "0" }}>Password</label>
              {passwordError && (
                <span
                  className="password-error-message"
                  style={{ color: "red", fontSize: "12px" }}
                >
                  *{passwordError}
                </span>
              )}
            </div>
            <input
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div className="forgot-password">
            <Link to="/forgot-password">Lupa Password?</Link>
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? <span className="spinner"></span> : "Login"}
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
