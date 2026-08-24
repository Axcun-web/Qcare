import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) { const [user, setUser] = useState(null), [loading, setLoading] = useState(true); useEffect(() => { const token = localStorage.getItem("qcare_token"); if (!token) return setLoading(false); api("/auth/me").then((data) => setUser(data.data)).catch(() => localStorage.removeItem("qcare_token")).finally(() => setLoading(false)); }, []); const login = ({ token, user: value }) => { localStorage.setItem("qcare_token", token); setUser(value); }; const logout = () => { localStorage.removeItem("qcare_token"); setUser(null); }; return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>; }
export const useAuth = () => useContext(AuthContext);
