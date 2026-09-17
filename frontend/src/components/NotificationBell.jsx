import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import "./NotificationBell.css";

export default function NotificationBell() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return (
    <div className="notif-bell" ref={notifRef}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setNotifOpen((open) => !open)}
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
  );
}
