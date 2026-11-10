import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("qcare_token");
    if (!token) return setLoading(false);
    api("/auth/me")
      .then((data) => setUser(data.data))
      .catch(() => localStorage.removeItem("qcare_token"))
      .finally(() => setLoading(false));
  }, []);
  const login = ({ token, user: value }) => {
    localStorage.setItem("qcare_token", token);
    setUser(value);
  };
  const logout = () => {
    localStorage.removeItem("qcare_token");
    setUser(null);
  };
  // Re-reads the profile after the user changes it (e.g. Ubah Nama), so the
  // navbar and greetings show the new value without a reload.
  const refreshUser = async () => {
    const data = await api("/auth/me");
    setUser(data.data);
    return data.data;
  };
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
