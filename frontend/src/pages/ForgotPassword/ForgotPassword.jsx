import "./ForgotPassword.css";
import { Link } from "react-router-dom";
import { useState } from "react";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");

    const handleReset = (e) => {
        e.preventDefault();

        if (!email.endsWith("@gmail.com")) {
            setEmailError("Gunakan @gmail.com");
            return;
        }

        setEmailError("");
        console.log("Data siap dikirim ke backend:", { email });
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (emailError) {
            setEmailError("");
        }
    };

    return (
        <div className="forgot-page">
            <div className="forgot-card">
                <div className="logo-section">
                    <h1>Qcare</h1>
                    <p>Queue Management System</p>
                </div>
                
                <form className="form-section" onSubmit={handleReset} noValidate>
                    <h2>Lupa Password</h2>
                    <p className="description">
                        Jangan khawatir. Masukkan email yang terdaftar dan kami akan mengirimkan tautan untuk mengatur ulang password Anda.
                    </p>
                    
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
                    
                    <button type="submit" className="send-btn">
                        Kirim Link Reset
                    </button>
                    
                    <div className="back-login">
                        <Link to="/">
                            ← Kembali ke Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ForgotPassword;