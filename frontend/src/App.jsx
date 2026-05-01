import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Profile from "./pages/Profile";
import SolicitudesServicios from "./pages/SolicitudesServicios";
import Admin from "./pages/Admin";
import Propuestas from "./pages/Propuestas";
import Denuncias from "./pages/Denuncias";
import PublicProfile from "./pages/PublicProfile";
import Biblioteca from "./pages/Biblioteca";
import Notificaciones from "./pages/Notificaciones";
import Foros from "./pages/Foros";
import Zonas from "./pages/Zonas";
import ZonasDenuncias from "./pages/ZonasDenuncias";
import Encuestas from "./pages/Encuestas";

function useDarkMode() {
  useEffect(() => {
    const saved = localStorage.getItem("pc_dark");
    if (saved === "true" || (saved === null && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);
}

export function toggleDark() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("pc_dark", isDark ? "true" : "false");
}

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ user, children }) {
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppInner() {
  const { user, loading } = useAuth();
  useDarkMode();

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-bg flex items-center justify-center shadow-soft-xl">
            <i className="fas fa-landmark text-white text-2xl animate-pulse"></i>
          </div>
          <p className="text-brand-teal font-medium">Cargando Portal Ciudadano...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Dashboard /> : <Landing />} />
      <Route
        path="/login"
        element={(
          <GuestRoute user={user}>
            <Login />
          </GuestRoute>
        )}
      />
      <Route
        path="/registro"
        element={(
          <GuestRoute user={user}>
            <Register />
          </GuestRoute>
        )}
      />
      <Route path="/agenda" element={<ProtectedRoute user={user}><Agenda /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
      <Route path="/solicitudes-servicios" element={<ProtectedRoute user={user}><SolicitudesServicios /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute user={user}><Admin /></ProtectedRoute>} />
      <Route path="/propuestas" element={<ProtectedRoute user={user}><Propuestas /></ProtectedRoute>} />
      <Route path="/denuncias" element={<ProtectedRoute user={user}><Denuncias /></ProtectedRoute>} />
      <Route path="/biblioteca" element={<ProtectedRoute user={user}><Biblioteca /></ProtectedRoute>} />
      <Route path="/foros" element={<ProtectedRoute user={user}><Foros /></ProtectedRoute>} />
      <Route path="/notificaciones" element={<ProtectedRoute user={user}><Notificaciones /></ProtectedRoute>} />
      <Route path="/zonas" element={<ProtectedRoute user={user}><Zonas /></ProtectedRoute>} />
      <Route path="/zonas-denuncias" element={<ProtectedRoute user={user}><ZonasDenuncias /></ProtectedRoute>} />
      <Route path="/encuestas" element={<ProtectedRoute user={user}><Encuestas /></ProtectedRoute>} />
      <Route path="/u/:username" element={<ProtectedRoute user={user}><PublicProfile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AuthProvider>
  );
}
