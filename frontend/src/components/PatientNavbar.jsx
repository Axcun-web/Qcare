import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import "./PatientNavbar.css";

export default function PatientNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = () => {
    api("/notifications")
      .then((res) => {
        setNotifications(res.data.items || []);
        setUnread(res.data.unread || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleNotifPanel = () => {
    setNotifOpen((open) => !open);
  };

  const markRead = (id) => {
    api(`/notifications/${id}/read`, { method: "PATCH" })
      .then(() => loadNotifications())
      .catch(() => {});
  };

  const markAllRead = () => {
    api("/notifications/read-all", { method: "PATCH" })
      .then(() => loadNotifications())
      .catch(() => {});
  };

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

      <div className="patient-navbar-notif" ref={notifRef}>
        <button
          type="button"
          className="notif-bell-btn"
          onClick={toggleNotifPanel}
          aria-label="Notifikasi"
        >
          🔔
          {unread > 0 && <span className="notif-badge">{unread}</span>}
        </button>

        {notifOpen && (
          <div className="notif-panel">
            <div className="notif-panel-header">
              <span>Notifikasi</span>
              {unread > 0 && (
                <button type="button" onClick={markAllRead}>
                  Tandai semua dibaca
                </button>
              )}
            </div>
            <div className="notif-panel-list">
              {notifications.length === 0 && (
                <div className="notif-empty">Belum ada notifikasi.</div>
              )}
              {notifications.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className={`notif-item${n.sudahDibaca ? "" : " notif-item--unread"}`}
                  onClick={() => !n.sudahDibaca && markRead(n.id)}
                >
                  <span className="notif-item-message">{n.pesan}</span>
                  <span className="notif-item-time">
                    {new Date(n.waktuKirim).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
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
            <Link to="/settings" onClick={() => setDropdownOpen(false)}>
              Pengaturan
            </Link>
            <button onClick={handleLogout} className="logout-btn">
              Keluar
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
