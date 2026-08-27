import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import PatientData from "./pages/isi_data/PatientData";
import Appointments from "./pages/Appointments/Appointments";
import Settings from "./pages/Settings/Settings";
import PatientDashboard from "./pages/PatientDashboard/PatientDashboard";

function App() {
  return (
    <Routes>
      <Route path="/Login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/patient-data" element={<PatientData />} />
      <Route path="/appointments" element={<Appointments />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/patient-dashboard" element={<PatientDashboard />} />
    </Routes>
  );
}

export default App;