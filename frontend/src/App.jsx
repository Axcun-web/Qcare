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
import UbahNama from "./pages/ubahNama/ubahNama";
import UbahPassword from "./pages/ubahPassword/ubahPassword";
import AboutUs from "./pages/AboutUs/AboutUs";
import Feedback from "./pages/Feedback/Feedback";

function App() {
  return (
    <AuthProvider>  
      <Routes>
        <Route path="/Login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/patient-data" element={<PatientData />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/clinics" element={<Clinics />} />
        <Route path="/ubah-nama" element={<UbahNama />} />
        <Route path="/ubah-password" element={<UbahPassword />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/feedback" element={<Feedback />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
