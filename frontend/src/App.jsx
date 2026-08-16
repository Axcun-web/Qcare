import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import PatientData from "./pages/isi_data/PatientData";
import Appointments from "./pages/Appointments/Appointments";
import Settings from "./pages/Settings/Settings";

function App() {
  return (
    <Routes>
      <Route path="/Login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/patient-data" element={<PatientData />} />
      <Route path="/appointments" element={<Appointments />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export default App;