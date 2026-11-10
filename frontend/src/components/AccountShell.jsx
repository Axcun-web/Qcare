import PatientNavbar from "./PatientNavbar";
import PetugasNavbar from "./PetugasNavbar";
import { useAuth } from "../context/AuthContext";
import "./AccountShell.css";

/**
 * Wraps the account pages (Ubah Nama, Ubah Password, Tentang Aplikasi,
 * Masukan) with the role's navbar, like Settings, so they no longer look
 * like a separate app. Petugas and Super Admin share the console navbar,
 * which adapts to the role.
 */
export default function AccountShell({ children }) {
  const { user } = useAuth();
  const isStaff = user?.role === "PETUGAS" || user?.role === "SUPERADMIN";
  return (
    <div className="account-shell">
      {isStaff ? <PetugasNavbar /> : <PatientNavbar />}
      {children}
    </div>
  );
}
