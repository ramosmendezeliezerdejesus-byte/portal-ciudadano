import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { toggleDark } from "../App";
import CampaignsPanel from "../components/admin/CampaignsPanel";
import CommunityReportsPanel from "../components/admin/CommunityReportsPanel";
import NavMenu from "../components/NavMenu";

// ── Utils ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-DO", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const ROLE_META = {
  diputado:         { label: "Diputado",              icon: "fa-star",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",  dot: "bg-amber-400" },
  presidente_junta: { label: "Presidente de Junta",   icon: "fa-home",  color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",   dot: "bg-green-500" },
};

const STATUS_META = {
  pending:  { label: "Pendiente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",  dot: "bg-amber-400" },
  approved: { label: "Aprobada",  color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",   dot: "bg-green-500" },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",           dot: "bg-red-500" },
};

const MODULES = [
  { icon: "fa-users",         title: "Gestión de Usuarios",      desc: "Administra cuentas, roles y permisos.",            dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { icon: "fa-bullhorn",      title: "Moderación de Propuestas", desc: "Revisa y aprueba propuestas ciudadanas.",           dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { icon: "fa-flag",          title: "Reportes y Denuncias",     desc: "Gestiona el contenido reportado.",                  dot: "bg-red-500",    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { icon: "fa-calendar-check",title: "Control de Reuniones",     desc: "Supervisa las reuniones y su asistencia.",          dot: "bg-teal-500",   badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  { icon: "fa-chart-bar",     title: "Estadísticas",             desc: "Visualiza actividad y participación.",              dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { icon: "fa-cog",           title: "Configuración",            desc: "Ajusta parámetros globales del sistema.",           dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
];

// ── RequestCard ────────────────────────────────────────────────────────────
function RequestCard({ req, onReview }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes,     setNotes]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const role   = ROLE_META[req.requested_role]   ?? ROLE_META.diputado;
  const status = STATUS_META[req.status]          ?? STATUS_META.pending;
  const p      = req.profile ?? {};

  async function handle(action) {
    setLoading(true);
    await onReview(req.id, action, notes);
    setLoading(false);
    setNotesOpen(false);
  }

  return (
    <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft p-5 slide-in hover:border-brand-teal/25 transition-all">

      {/* ── Cabecera ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full avatar-teal flex items-center justify-center text-white font-bold shrink-0">
            {p.avatar_initials ?? "US"}
          </div>
          <div>
            <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream">
              {p.full_name ?? "Usuario"}
            </p>
            <p className="text-xs text-brand-teal">@{p.username ?? "usuario"}</p>
            <p className="text-xs text-gray-400">{p.email}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
          {status.label}
        </span>
      </div>

      {/* ── Datos de la solicitud ── */}
      <div className="space-y-2 mb-4 p-3 rounded-xl bg-brand-cream/60 dark:bg-brand-navy/30 border border-brand-teal/10">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${role.color}`}>
            <i className={`fas ${role.icon} text-[10px]`}></i>
            {role.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <i className="fas fa-map-marker-alt text-brand-terracotta w-4 text-center"></i>
          <span>{req.province}</span>
        </div>
        {req.office_address && (
          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
            <i className="fas fa-building text-brand-teal w-4 text-center mt-0.5"></i>
            <span>{req.office_address}</span>
          </div>
        )}
        {req.latitude && req.longitude && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <i className="fas fa-crosshairs text-brand-teal w-4 text-center"></i>
            <span>{req.latitude}, {req.longitude}</span>
            <a
              href={`https://maps.google.com/?q=${req.latitude},${req.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-teal hover:underline ml-1"
            >
              Ver mapa
            </a>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <i className="fas fa-clock w-4 text-center"></i>
          <span>Enviada el {fmtDate(req.created_at)}</span>
        </div>
      </div>

      {/* ── Documento de prueba ── */}
      <a
        href={req.proof_file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-brand-teal/20 hover:bg-brand-teal/5 text-brand-teal text-sm font-medium transition-colors mb-4"
      >
        <i className="fas fa-file-alt"></i>
        <span className="flex-1">Ver documento adjunto</span>
        <i className="fas fa-external-link-alt text-xs"></i>
      </a>

      {/* ── Notas del admin ── */}
      {notesOpen && (
        <div className="mb-3">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas opcionales para el usuario..."
            rows={2}
            className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 resize-none focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm transition-all"
          />
        </div>
      )}

      {/* ── Acciones (solo si está pendiente) ── */}
      {req.status === "pending" && (
        <div className="flex gap-2">
          {!notesOpen ? (
            <>
              <button
                onClick={() => handle("approve")}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                Aprobar
              </button>
              <button
                onClick={() => setNotesOpen(true)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-500 border border-red-200 dark:border-red-800 text-sm font-semibold transition-all disabled:opacity-50"
              >
                <i className="fas fa-times"></i>
                Rechazar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handle("reject")}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-times"></i>}
                Confirmar rechazo
              </button>
              <button
                onClick={() => { setNotesOpen(false); setNotes(""); }}
                className="px-4 py-2.5 rounded-xl border border-brand-teal/20 text-gray-400 hover:text-brand-navy text-sm transition-all"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Notas si ya fue revisada ── */}
      {req.status !== "pending" && req.admin_notes && (
        <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-teal/10 text-xs text-gray-500">
          <i className="fas fa-comment-alt mr-1.5"></i>
          {req.admin_notes}
        </div>
      )}
    </div>
  );
}

// ── Admin ──────────────────────────────────────────────────────────────────
export default function Admin() {
  const {
    user,
    adminGetVerificationRequests, adminReviewRequest,
    adminGetUsers, adminDeleteUser, adminChangeRole,
    adminGetMeetings, adminDeleteMeeting,
    getProposals,
  } = useAuth();

  const [activeModule,   setActiveModule]   = useState(null);
  const [activeTab,      setActiveTab]      = useState("pending");
  const [requests,       setRequests]       = useState([]);
  const [loadingReqs,    setLoadingReqs]    = useState(true);
  const [reviewError,    setReviewError]    = useState("");
  const [pendingCount,   setPendingCount]   = useState(0);

  // ── usuarios ──────────────────────────────────────────────────────────────
  const [users,         setUsers]         = useState([]);
  const [loadingUsers,  setLoadingUsers]  = useState(false);
  const [usersError,    setUsersError]    = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [userSearch,    setUserSearch]    = useState("");
  const [roleMenu,      setRoleMenu]      = useState(null);

  // ── reuniones ─────────────────────────────────────────────────────────────
  const [meetings,         setMeetings]         = useState([]);
  const [loadingMeetings,  setLoadingMeetings]  = useState(false);
  const [meetingsError,    setMeetingsError]    = useState("");
  const [meetingDeleteConfirm, setMeetingDeleteConfirm] = useState(null);
  const [meetingSearch,    setMeetingSearch]    = useState("");

  // ── propuestas ────────────────────────────────────────────────────────────
  const [proposals,        setProposals]        = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [proposalsError,   setProposalsError]   = useState("");
  const [proposalTab,      setProposalTab]      = useState("recibida");
  const [proposalSearch,   setProposalSearch]   = useState("");

  // Redirigir si no es super_admin
  useEffect(() => {
    if (user && user.role !== "super_admin") window.location.href = "/";
  }, [user]);

  // Cargar solicitudes
  const fetchRequests = useCallback(async (status) => {
    setLoadingReqs(true);
    setReviewError("");
    try {
      const data = await adminGetVerificationRequests(status);
      setRequests(data);
    } catch (err) {
      setReviewError(err.message);
    }
    setLoadingReqs(false);
  }, [adminGetVerificationRequests]);

  // Cargar conteo de pendientes para el badge del módulo
  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await adminGetVerificationRequests("pending");
      setPendingCount(data.length);
    } catch (_) {}
  }, [adminGetVerificationRequests]);

  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchPendingCount();
    }
  }, [user, fetchPendingCount]);

  useEffect(() => {
    if (user?.role === "super_admin" && activeModule === "verificaciones") fetchRequests(activeTab);
    if (user?.role === "super_admin" && activeModule === "usuarios")       fetchUsers();
    if (user?.role === "super_admin" && activeModule === "reuniones")      fetchAdminMeetings();
    if (user?.role === "super_admin" && activeModule === "propuestas")     fetchProposals();
  }, [activeTab, activeModule, user, fetchRequests]);

  const fetchProposals = useCallback(async () => {
    setLoadingProposals(true);
    setProposalsError("");
    try {
      const data = await getProposals({ status: proposalTab });
      setProposals(data);
    } catch (err) { setProposalsError(err.message); }
    setLoadingProposals(false);
  }, [getProposals, proposalTab]);

  useEffect(() => {
    if (user?.role === "super_admin" && activeModule === "propuestas") fetchProposals();
  }, [proposalTab, activeModule, user]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const data = await adminGetUsers();
      setUsers(data);
    } catch (err) { setUsersError(err.message); }
    setLoadingUsers(false);
  }, [adminGetUsers]);

  const fetchAdminMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    setMeetingsError("");
    try {
      const data = await adminGetMeetings();
      setMeetings(data);
    } catch (err) { setMeetingsError(err.message); }
    setLoadingMeetings(false);
  }, [adminGetMeetings]);

  async function handleDeleteUser(userId) {
    try {
      await adminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err) { setUsersError(err.message); }
  }

  async function handleChangeRole(userId, newRole) {
    try {
      await adminChangeRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, role: newRole, verified: ["verified","diputado","presidente_junta"].includes(newRole) }
        : u
      ));
      setRoleMenu(null);
    } catch (err) { setUsersError(err.message); }
  }

  async function handleDeleteMeeting(meetingId) {
    try {
      await adminDeleteMeeting(meetingId);
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      setMeetingDeleteConfirm(null);
    } catch (err) { setMeetingsError(err.message); }
  }

  // Aprobar o rechazar
  async function handleReview(reqId, action, notes) {
    setReviewError("");
    try {
      await adminReviewRequest(reqId, action, notes);
      setRequests(prev => prev.filter(r => r.id !== reqId));
      // Actualizar badge
      if (action === "approve" || action === "reject") {
        setPendingCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      setReviewError(err.message);
    }
  }

  if (!user || user.role !== "super_admin") return null;

  const TABS = [
    { id: "pending",  label: "Pendientes", icon: "fa-clock",        color: "text-amber-500" },
    { id: "approved", label: "Aprobadas",  icon: "fa-check-circle", color: "text-green-500" },
    { id: "rejected", label: "Rechazadas", icon: "fa-times-circle", color: "text-red-500" },
  ];

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="w-9 h-9 rounded-xl bg-brand-cream dark:bg-brand-navy/50 flex items-center justify-center hover:bg-brand-teal/10 transition-colors border border-brand-teal/20 text-brand-navy dark:text-brand-cream">
              <i className="fas fa-arrow-left text-sm"></i>
            </a>
            <div className="flex items-center gap-2">
              <i className="fas fa-shield-alt text-gray-800 dark:text-white text-xl"></i>
              <span className="font-serif font-bold text-brand-navy dark:text-brand-cream text-lg hidden sm:block">
                Panel de Administración
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-cream dark:bg-brand-navy/50 border border-brand-teal/20">
              <i className="fas fa-shield-alt text-gray-700 dark:text-gray-300 text-xs"></i>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Super Admin</span>
            </div>
            <NavMenu currentPath="/admin" />
          </div>
        </div>
      </header>

      <main className="pt-24 pb-10">
        <div className="max-w-6xl mx-auto px-4 space-y-6">

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft overflow-hidden slide-in">
            <div className="h-24 gradient-bg relative">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 14px)" }} />
            </div>
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 -mt-8">
                <div className="w-14 h-14 rounded-2xl bg-gray-900 dark:bg-gray-800 border-4 border-white dark:border-brand-navy shadow-lg flex items-center justify-center shrink-0">
                  <i className="fas fa-shield-alt text-white text-xl"></i>
                </div>
                <div className="mt-8">
                  <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">
                    Bienvenido, {user.full_name.split(" ")[0]}
                  </h2>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                    Acceso completo · Portal Ciudadano
                  </p>
                </div>
              </div>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-teal/30 text-brand-teal text-sm font-semibold hover:bg-brand-teal hover:text-white transition-all self-end sm:self-auto"
              >
                <i className="fas fa-database text-xs"></i>
                Supabase Dashboard
              </a>
            </div>
          </div>

          {/* ── Vista del módulo activo ───────────────────────────────────── */}
          {activeModule === "verificaciones" && (
            <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft overflow-hidden slide-in">

              {/* Cabecera */}
              <div className="px-5 pt-5 pb-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-lg flex items-center gap-2">
                    <i className="fas fa-id-card text-brand-teal text-base"></i>
                    Solicitudes de Verificación
                  </h3>
                  <button
                    onClick={() => setActiveModule(null)}
                    className="w-8 h-8 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-gray-400 hover:text-brand-navy dark:hover:text-brand-cream transition-colors border border-brand-teal/20"
                    title="Cerrar"
                  >
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-brand-teal/10">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative ${
                        activeTab === tab.id
                          ? "text-brand-teal"
                          : "text-gray-400 hover:text-brand-navy dark:hover:text-brand-cream"
                      }`}
                    >
                      <i className={`fas ${tab.icon} ${activeTab === tab.id ? tab.color : ""} text-sm`}></i>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.id === "pending" && pendingCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-brand-terracotta text-white text-[10px] font-bold flex items-center justify-center">
                          {pendingCount}
                        </span>
                      )}
                      {activeTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-teal rounded-full" />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => fetchRequests(activeTab)}
                    className="ml-auto mr-2 mb-1 self-center w-7 h-7 rounded-lg hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors"
                    title="Recargar"
                  >
                    <i className={`fas fa-sync-alt text-xs ${loadingReqs ? "fa-spin" : ""}`}></i>
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-5">
                {reviewError && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    <i className="fas fa-exclamation-circle shrink-0"></i>
                    <span>{reviewError}</span>
                  </div>
                )}
                {loadingReqs ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                      <div key={i} className="rounded-2xl h-48 animate-pulse bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/10" />
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/50 border border-brand-teal/20 flex items-center justify-center">
                      <i className="fas fa-inbox text-brand-teal/40 text-xl"></i>
                    </div>
                    <p className="text-gray-400 font-medium text-sm">
                      No hay solicitudes {activeTab === "pending" ? "pendientes" : activeTab === "approved" ? "aprobadas" : "rechazadas"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requests.map(req => (
                      <RequestCard key={req.id} req={req} onReview={handleReview} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Vista: Gestión de Usuarios ───────────────────────────────── */}
          {activeModule === "usuarios" && (
            <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft overflow-hidden slide-in">

              {/* Cabecera */}
              <div className="px-5 pt-5 pb-4 border-b border-brand-teal/10">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-lg flex items-center gap-2">
                    <i className="fas fa-users text-blue-500 text-base"></i>
                    Gestión de Usuarios
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{users.length} usuarios</span>
                    <button
                      onClick={fetchUsers}
                      className="w-7 h-7 rounded-lg hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors"
                      title="Recargar"
                    >
                      <i className={`fas fa-sync-alt text-xs ${loadingUsers ? "fa-spin" : ""}`}></i>
                    </button>
                    <button
                      onClick={() => setActiveModule(null)}
                      className="w-8 h-8 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-gray-400 hover:text-brand-navy dark:hover:text-brand-cream transition-colors border border-brand-teal/20"
                      title="Cerrar"
                    >
                      <i className="fas fa-times text-sm"></i>
                    </button>
                  </div>
                </div>
                {/* Buscador */}
                <div className="relative">
                  <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Buscar por nombre, usuario o correo..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>

              {/* Lista */}
              <div className="p-5">
                {usersError && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    <i className="fas fa-exclamation-circle shrink-0"></i>
                    <span>{usersError}</span>
                  </div>
                )}

                {loadingUsers ? (
                  <div className="space-y-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-16 rounded-xl animate-pulse bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/10" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users
                      .filter(u =>
                        !userSearch ||
                        u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map(u => {
                        const isMe = u.id === user?.id;
                        const roleMeta = {
                          super_admin:      { label: "Super Admin",    icon: "fa-shield-alt", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
                          diputado:         { label: "Diputado",       icon: "fa-star",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
                          presidente_junta: { label: "Pres. Junta",    icon: "fa-home",       color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
                          verified:         { label: "Verificado",     icon: "fa-check",      color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
                          user:             { label: "Ciudadano",      icon: "fa-user",       color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
                        }[u.role] ?? { label: u.role, icon: "fa-user", color: "bg-gray-100 text-gray-500" };

                        return (
                          <div
                            key={u.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-teal/5 border border-transparent hover:border-brand-teal/10 transition-all group"
                          >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full avatar-teal flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {u.avatar_initials ?? "US"}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-brand-navy dark:text-brand-cream truncate">
                                  {u.full_name}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal font-medium">Tú</span>
                                )}
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleMeta.color}`}>
                                  <i className={`fas ${roleMeta.icon} text-[8px]`}></i>
                                  {roleMeta.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-xs text-brand-teal">@{u.username}</span>
                                <span className="text-xs text-gray-400 truncate">{u.email}</span>
                              </div>
                            </div>

                            {/* Acciones */}
                            {!isMe && (
                              <div className="flex items-center gap-1 shrink-0">
                                {deleteConfirm === u.id ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">¿Eliminar?</span>
                                    <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">Sí</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg border border-brand-teal/20 text-gray-400 text-xs hover:text-brand-navy transition-colors">No</button>
                                  </div>
                                ) : (
                                  <>
                                    {/* Botón cambiar rol */}
                                    <div className="relative">
                                      <button
                                        onClick={() => setRoleMenu(roleMenu === u.id ? null : u.id)}
                                        className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-brand-teal/10 flex items-center justify-center text-gray-300 hover:text-brand-teal transition-all"
                                        title="Cambiar rol"
                                      >
                                        <i className="fas fa-user-tag text-xs"></i>
                                      </button>
                                      {roleMenu === u.id && (
                                        <div className="absolute right-0 top-9 w-44 card-soft rounded-xl shadow-lg border border-brand-teal/20 z-30 overflow-hidden">
                                          <p className="text-[10px] text-gray-400 font-semibold uppercase px-3 pt-2 pb-1">Cambiar rol a</p>
                                          {[
                                            { value: "user",             label: "Ciudadano",         icon: "fa-user",       color: "text-blue-500" },
                                            { value: "verified",         label: "Verificado",         icon: "fa-check-circle",color: "text-brand-teal" },
                                            { value: "diputado",         label: "Diputado",           icon: "fa-star",       color: "text-amber-500" },
                                            { value: "presidente_junta", label: "Pres. Junta",        icon: "fa-home",       color: "text-green-600" },
                                          ].map(r => (
                                            <button
                                              key={r.value}
                                              onClick={() => handleChangeRole(u.id, r.value)}
                                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-brand-teal/5 transition-colors ${u.role === r.value ? "bg-brand-teal/10 font-semibold" : ""}`}
                                            >
                                              <i className={`fas ${r.icon} ${r.color} w-4 text-center`}></i>
                                              <span className="text-brand-navy dark:text-brand-cream">{r.label}</span>
                                              {u.role === r.value && <i className="fas fa-check text-brand-teal text-[10px] ml-auto"></i>}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    {/* Botón eliminar */}
                                    <button
                                      onClick={() => setDeleteConfirm(u.id)}
                                      className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all"
                                      title="Eliminar usuario"
                                    >
                                      <i className="fas fa-trash-alt text-xs"></i>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Vista: Control de Reuniones ──────────────────────────────── */}
          {activeModule === "reuniones" && (
            <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft overflow-hidden slide-in">
              <div className="px-5 pt-5 pb-4 border-b border-brand-teal/10">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-lg flex items-center gap-2">
                    <i className="fas fa-calendar-check text-teal-500 text-base"></i>
                    Control de Reuniones
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{meetings.length} reuniones</span>
                    <button onClick={fetchAdminMeetings} className="w-7 h-7 rounded-lg hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors">
                      <i className={`fas fa-sync-alt text-xs ${loadingMeetings ? "fa-spin" : ""}`}></i>
                    </button>
                    <button onClick={() => setActiveModule(null)} className="w-8 h-8 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-gray-400 hover:text-brand-navy dark:hover:text-brand-cream transition-colors border border-brand-teal/20">
                      <i className="fas fa-times text-sm"></i>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
                  <input
                    value={meetingSearch}
                    onChange={e => setMeetingSearch(e.target.value)}
                    placeholder="Buscar por título o lugar..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div className="p-5">
                {meetingsError && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    <i className="fas fa-exclamation-circle shrink-0"></i>
                    <span>{meetingsError}</span>
                  </div>
                )}
                {loadingMeetings ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/10" />)}
                  </div>
                ) : meetings.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/50 border border-brand-teal/20 flex items-center justify-center">
                      <i className="fas fa-calendar-times text-brand-teal/40 text-xl"></i>
                    </div>
                    <p className="text-gray-400 text-sm">No hay reuniones registradas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {meetings
                      .filter(m =>
                        !meetingSearch ||
                        m.title?.toLowerCase().includes(meetingSearch.toLowerCase()) ||
                        m.location?.toLowerCase().includes(meetingSearch.toLowerCase())
                      )
                      .map(m => {
                        const catColor = {
                          presupuesto: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                          transporte:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          seguridad:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          ambiente:    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
                          educacion:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                          general:     "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                        }[m.category] ?? "bg-gray-100 text-gray-600";
                        const upcoming = new Date(m.date + "T23:59:59") >= new Date();

                        return (
                          <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-brand-teal/5 border border-transparent hover:border-brand-teal/10 transition-all group">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-sm text-brand-navy dark:text-brand-cream truncate">{m.title}</span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColor}`}>{m.category}</span>
                                {!upcoming && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">Pasada</span>}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                                <span><i className="fas fa-calendar-alt mr-1 text-brand-teal/60"></i>{m.date}</span>
                                <span><i className="fas fa-map-marker-alt mr-1 text-brand-terracotta/60"></i>{m.location}</span>
                                <span><i className="fas fa-user mr-1 text-brand-teal/60"></i>@{m.profiles?.username ?? "?"}</span>
                                {m.rsvp_count > 0 && <span className="text-brand-terracotta"><i className="fas fa-users mr-1 text-[10px]"></i>{m.rsvp_count} asistentes</span>}
                              </div>
                            </div>

                            {meetingDeleteConfirm === m.id ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-gray-500">¿Eliminar?</span>
                                <button onClick={() => handleDeleteMeeting(m.id)} className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">Sí</button>
                                <button onClick={() => setMeetingDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg border border-brand-teal/20 text-gray-400 text-xs hover:text-brand-navy transition-colors">No</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setMeetingDeleteConfirm(m.id)}
                                className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all shrink-0"
                              >
                                <i className="fas fa-trash-alt text-xs"></i>
                              </button>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Vista: Moderación de Propuestas ──────────────────────────── */}
          {activeModule === "propuestas" && (
            <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft overflow-hidden slide-in">
              <div className="px-5 pt-5 pb-0 border-b border-brand-teal/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-lg flex items-center gap-2">
                    <i className="fas fa-bullhorn text-amber-500 text-base"></i>
                    Moderación de Propuestas
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{proposals.length} propuestas</span>
                    <button onClick={fetchProposals} className="w-7 h-7 rounded-lg hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors">
                      <i className={`fas fa-sync-alt text-xs ${loadingProposals ? "fa-spin" : ""}`}></i>
                    </button>
                    <button onClick={() => setActiveModule(null)} className="w-8 h-8 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-gray-400 hover:text-brand-navy dark:hover:text-brand-cream transition-colors border border-brand-teal/20">
                      <i className="fas fa-times text-sm"></i>
                    </button>
                  </div>
                </div>
                <div className="flex border-b border-brand-teal/10 -mb-px">
                  {[
                    { value: "recibida",   label: "Recibidas",  icon: "fa-inbox",       color: "text-amber-500" },
                    { value: "en_gestion", label: "En gestión", icon: "fa-cogs",         color: "text-blue-500" },
                    { value: "resuelta",   label: "Resueltas",  icon: "fa-check-circle", color: "text-green-500" },
                  ].map(tab => (
                    <button key={tab.value} onClick={() => setProposalTab(tab.value)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative ${
                        proposalTab === tab.value ? "text-brand-teal" : "text-gray-400 hover:text-brand-navy dark:hover:text-brand-cream"
                      }`}>
                      <i className={`fas ${tab.icon} ${proposalTab === tab.value ? tab.color : ""} text-sm`}></i>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {proposalTab === tab.value && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-teal rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-5">
                {proposalsError && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    <i className="fas fa-exclamation-circle shrink-0"></i><span>{proposalsError}</span>
                  </div>
                )}
                {loadingProposals ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/10" />)}</div>
                ) : proposals.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/50 border border-brand-teal/20 flex items-center justify-center">
                      <i className="fas fa-bullhorn text-brand-teal/40 text-xl"></i>
                    </div>
                    <p className="text-gray-400 text-sm">No hay propuestas {proposalTab === "recibida" ? "recibidas" : proposalTab === "en_gestion" ? "en gestión" : "resueltas"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {proposals.map(p => {
                      const profile = p.profile ?? {};
                      const manager = p.manager ?? null;
                      const catColors = { infraestructura:"bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", seguridad:"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", ambiente:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", educacion:"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", salud:"bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400", transporte:"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", otro:"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
                      const catLabels = { infraestructura:"Infraestructura", seguridad:"Seguridad", ambiente:"Medio Ambiente", educacion:"Educación", salud:"Salud", transporte:"Transporte", otro:"Otro" };
                      return (
                        <div key={p.id} className="flex items-start gap-3 p-4 rounded-xl border border-brand-teal/10 hover:border-brand-teal/25 hover:bg-brand-teal/5 transition-all">
                          {p.image_url ? <img src={p.image_url} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-brand-teal/10" />
                            : p.video_url ? <div className="w-14 h-14 rounded-xl bg-black flex items-center justify-center shrink-0"><i className="fas fa-play text-white text-xs"></i></div>
                            : <div className="w-14 h-14 rounded-xl bg-brand-cream dark:bg-brand-navy/30 flex items-center justify-center shrink-0"><i className="fas fa-bullhorn text-brand-teal/40 text-lg"></i></div>
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColors[p.category] ?? catColors.otro}`}>{catLabels[p.category] ?? "Otro"}</span>
                            </div>
                            <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream leading-snug line-clamp-1">{p.title}</p>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{p.description}</p>
                            {p.location_text && <p className="text-[10px] text-gray-400 mt-0.5"><i className="fas fa-map-marker-alt text-brand-terracotta mr-1"></i>{p.location_text}</p>}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full avatar-teal flex items-center justify-center text-white text-[9px] font-bold">{profile.avatar_initials ?? "US"}</div>
                                <span className="text-[10px] text-gray-400">{profile.full_name ?? "Usuario"}</span>
                              </div>
                              {p.status === "resuelta" && manager && <span className="text-[10px] text-green-600 dark:text-green-400"><i className="fas fa-check-circle mr-1"></i>Resuelto por {manager.full_name}</span>}
                              {p.status === "en_gestion" && manager && <span className="text-[10px] text-blue-600 dark:text-blue-400"><i className="fas fa-cogs mr-1"></i>Gestionado por {manager.full_name}</span>}
                            </div>
                          </div>
                          {p.evidence_url && (
                            <a href={p.evidence_url} target="_blank" rel="noreferrer" className="shrink-0 w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 hover:bg-green-200 transition-colors" title="Ver evidencia">
                              <i className="fas fa-file-alt text-sm"></i>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === "campanas" && (
            <CampaignsPanel onClose={() => setActiveModule(null)} />
          )}

          {activeModule === "reportes" && (
            <CommunityReportsPanel onClose={() => setActiveModule(null)} />
          )}

          <div>
            <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-lg mb-4 flex items-center gap-2">
              <i className="fas fa-th-large text-brand-teal text-base"></i>
              Módulos del sistema
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* ── Módulo ACTIVO: Solicitudes de Verificación ── */}
              <div
                onClick={() => setActiveModule("verificaciones")}
                className="card-soft rounded-2xl p-5 border-2 border-brand-teal/30 shadow-soft slide-in hover:border-brand-teal hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-brand-teal animate-pulse"></span>
                  <div className="w-10 h-10 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal group-hover:bg-brand-teal group-hover:text-white transition-all">
                    <i className="fas fa-id-card text-sm"></i>
                  </div>
                  {pendingCount > 0 && (
                    <span className="ml-auto w-6 h-6 rounded-full bg-brand-terracotta text-white text-xs font-bold flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-brand-navy dark:text-brand-cream text-sm mb-1.5 leading-snug">
                  Solicitudes de Verificación
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Revisa y aprueba solicitudes de diputados y presidentes de junta.
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-teal/40 to-transparent"></div>
              </div>

              {/* ── Módulos próximamente ── */}
              {MODULES.map((mod, i) => {
                const isUsers     = mod.title === "Gestión de Usuarios";
                const isMeetings  = mod.title === "Control de Reuniones";
                const isProposals = mod.title === "Moderación de Propuestas";
                const isActive    = isUsers || isMeetings || isProposals;
                return (
                  <div
                    key={mod.title}
                    onClick={
                      isUsers     ? () => setActiveModule("usuarios") :
                      isMeetings  ? () => setActiveModule("reuniones") :
                      isProposals ? () => setActiveModule("propuestas") :
                      undefined
                    }
                    className={`card-soft rounded-2xl p-5 border shadow-soft slide-in transition-all relative overflow-hidden group ${
                      isUsers     ? "border-2 border-blue-400/30 hover:border-blue-500 cursor-pointer" :
                      isMeetings  ? "border-2 border-teal-400/30 hover:border-teal-500 cursor-pointer" :
                      isProposals ? "border-2 border-amber-400/30 hover:border-amber-500 cursor-pointer" :
                                    "border-brand-teal/10 hover:border-brand-teal/25 cursor-not-allowed"
                    }`}
                    style={{ animationDelay: `${(i + 1) * 60}ms` }}
                  >
                    {!isActive && (
                      <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${mod.badge}`}>
                        Próximamente
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? mod.dot + " animate-pulse" : mod.dot}`}></span>
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                        isUsers     ? "bg-blue-100 dark:bg-blue-900/30 border-blue-200 text-blue-600 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500" :
                        isMeetings  ? "bg-teal-100 dark:bg-teal-900/30 border-teal-200 text-teal-600 group-hover:bg-teal-500 group-hover:text-white group-hover:border-teal-500" :
                        isProposals ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200 text-amber-600 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500" :
                                      "bg-brand-cream dark:bg-brand-navy/50 border-brand-teal/20 text-brand-teal group-hover:bg-brand-teal/10"
                      }`}>
                        <i className={`fas ${mod.icon} text-sm`}></i>
                      </div>
                    </div>
                    <h4 className="font-semibold text-brand-navy dark:text-brand-cream text-sm mb-1.5 pr-24 leading-snug">{mod.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{mod.desc}</p>
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent ${
                      isUsers ? "via-blue-400/40" : isMeetings ? "via-teal-400/40" : isProposals ? "via-amber-400/40" : "via-brand-teal/20"
                    } to-transparent`}></div>
                  </div>
                );
              })}

              <div
                onClick={() => setActiveModule("campanas")}
                className="card-soft rounded-2xl p-5 border-2 border-emerald-400/30 shadow-soft slide-in hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500 animate-pulse"></span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all">
                    <i className="fas fa-bullseye text-sm"></i>
                  </div>
                </div>
                <h4 className="font-semibold text-brand-navy dark:text-brand-cream text-sm mb-1.5 leading-snug">
                  Campanas informativas
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Crea campanas de educacion civica, activalas, editalas y difundelas por tema o sector.
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"></div>
              </div>

              <div
                onClick={() => setActiveModule("reportes")}
                className="card-soft rounded-2xl p-5 border-2 border-indigo-400/30 shadow-soft slide-in hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-indigo-500 animate-pulse"></span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-all">
                    <i className="fas fa-file-export text-sm"></i>
                  </div>
                </div>
                <h4 className="font-semibold text-brand-navy dark:text-brand-cream text-sm mb-1.5 leading-snug">
                  Reportes comunitarios
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Exporta PDF con resumen, Excel con todas las solicitudes y CSV para analisis.
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent"></div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
