import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./PatientNavbar.css"; 

export default function PatientNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login");
  };

  return (
    <nav className="patient-navbar">
      <Link to="/patient" className="patient-navbar-brand">
        <b>QCare</b>
      </Link>
      
      <div className="patient-navbar-links">
        <Link 
          to="/patient" 
          className={location.pathname === "/patient" ? "active" : ""}
        >
          Dashboard
        </Link>
        <Link 
          to="/clinics" 
          className={location.pathname === "/clinics" ? "active" : ""}
        >
          Klinik
        </Link>
        <Link 
          to="/appointments" 
          className={location.pathname === "/appointments" ? "active" : ""}
        >
          Janji Temu
        </Link>
        <Link 
          to="/history" 
          className={location.pathname === "/history" ? "active" : ""}
        >
          Riwayat
        </Link>
      </div>

      <div className="patient-navbar-user" ref={dropdownRef}>
        <button 
          className="user-avatar-btn" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="avatar-circle">
            {user?.nama ? user.nama.charAt(0).toUpperCase() : "P"}
          </div>
          <span className="user-name">{user?.nama || "Pasien"}</span>
        </button>

        {dropdownOpen && (
          <div className="user-dropdown">
            <Link to="/settings" onClick={() => setDropdownOpen(false)}>Settings</Link>
            <button 
              type="button" 
              onClick={() => {
                setDropdownOpen(false);
                alert("Notifications");
              }}
            >
              Notifications
            </button>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}
