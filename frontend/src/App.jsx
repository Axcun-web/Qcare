import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import PatientData from "./pages/isi_data/PatientData";
import Appointments from "./pages/Appointments/Appointments";
import Settings from "./pages/Settings/Settings";
import PatientDashboard from "./pages/PatientDashboard/PatientDashboard";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
import Clinics from "./pages/Clinics/Clinics";
import History from "./pages/History/History";
import UbahNama from "./pages/ubahNama/ubahNama";
import UbahPassword from "./pages/ubahPassword/ubahPassword";
import PetugasDashboard from "./pages/PetugasDashboard/PetugasDashboard";
import ManageClinics from "./pages/ManageClinics/ManageClinics";
import AboutUs from "./pages/AboutUs/AboutUs";
import Feedback from "./pages/Feedback/Feedback";

// Where to send a logged-in user who hits a route their role can't use -
// their own home, not a dead end.
const ROLE_HOME = {
  SUPERADMIN: "/admin",
  PETUGAS: "/petugas",
  PASIEN: "/patient",
};

function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] ?? "/login"} replace />;
  }
  return children;
}

const ANY_ROLE = ["PASIEN", "PETUGAS", "SUPERADMIN"];

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/Login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/patient-data"
          element={
            <RoleRoute roles={["PASIEN"]}>
              <PatientData />
            </RoleRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <RoleRoute roles={["PASIEN"]}>
              <Appointments />
            </RoleRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleRoute roles={ANY_ROLE}>
              <Settings />
            </RoleRoute>
          }
        />
        <Route
          path="/patient"
          element={
            <RoleRoute roles={["PASIEN"]}>
              <PatientDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute roles={["SUPERADMIN"]}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/manage-clinics"
          element={
            <RoleRoute roles={["PETUGAS"]}>
              <ManageClinics />
            </RoleRoute>
          }
        />
        <Route
          path="/petugas"
          element={
            <RoleRoute roles={["PETUGAS"]}>
              <PetugasDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/clinics"
          element={
            <RoleRoute roles={["PASIEN"]}>
              <Clinics />
            </RoleRoute>
          }
        />
        <Route
          path="/history"
          element={
            <RoleRoute roles={["PASIEN"]}>
              <History />
            </RoleRoute>
          }
        />
        <Route
          path="/ubah-nama"
          element={
            <RoleRoute roles={ANY_ROLE}>
              <UbahNama />
            </RoleRoute>
          }
        />
        <Route
          path="/ubah-password"
          element={
            <RoleRoute roles={ANY_ROLE}>
              <UbahPassword />
            </RoleRoute>
          }
        />
        <Route
          path="/about-us"
          element={
            <RoleRoute roles={ANY_ROLE}>
              <AboutUs />
            </RoleRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <RoleRoute roles={ANY_ROLE}>
              <Feedback />
            </RoleRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
