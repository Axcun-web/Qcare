import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import PatientData from "./pages/isi_data/PatientData";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";

function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  return user && roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/patient-data" element={<PatientData />} />
        <Route 
          path="/admin" 
          element={
            <RoleRoute roles={["SUPERADMIN"]}>
              <AdminDashboard />
            </RoleRoute>
          } 
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;