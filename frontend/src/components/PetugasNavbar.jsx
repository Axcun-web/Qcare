import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./PetugasNavbar.css";

export default function PetugasNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="petugas-navbar">
      <Link to="/petugas" className="petugas-navbar-brand">
        <b>QCare</b>
        <small>CONSOLE PETUGAS</small>
      </Link>
      
      <div className="petugas-navbar-links">
        <Link 
          to="/petugas" 
          className={location.pathname === "/petugas" ? "active" : ""}
        >
          Dashboard
        </Link>
        <Link 
          to="/manage-clinics" 
          className={location.pathname === "/manage-clinics" ? "active" : ""}
        >
          Klinik
        </Link>
      </div>

      <div className="petugas-navbar-user" ref={dropdownRef}>
        <button 
          className="user-avatar-btn" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="avatar-circle">
            {user?.nama ? user.nama.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="user-name">{user?.nama}</span>
        </button>

        {dropdownOpen && (
          <div className="user-dropdown">
            <Link to="/settings" onClick={() => setDropdownOpen(false)}>Pengaturan</Link>
            <button onClick={handleLogout} className="logout-btn">Keluar</button>
          </div>
        )}
      </div>
    </nav>
  );
}
