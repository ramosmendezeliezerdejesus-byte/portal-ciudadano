import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { toggleDark } from "../App";
import NavMenu from "../components/NavMenu";
import { VerificationBanner, VerificationForm } from "../components/VerificationForm";

// ── RoleBadge ──────────────────────────────────────────────────────────────
function RoleBadge({ role, verified }) {
  if (role === "super_admin") {
    return (
      <span title="Administrador del Portal">
        <i className="fas fa-shield-alt text-gray-900 dark:text-white text-base drop-shadow"></i>
      </span>
    );
  }
  if (verified || role === "verified") {
    return (
      <span title="Usuario verificado">
        <i className="fas fa-check-circle text-brand-teal text-base"></i>
      </span>
    );
  }
  return null;
}

// ── Utils ──────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)    return "Ahora";
  if (diff < 3600)  return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  return d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMeetingDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-DO", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function isUpcoming(dateStr) {
  return new Date(dateStr + "T23:59:59") >= new Date();
}

const CATEGORY_META = {
  presupuesto: { label: "Presupuesto",    icon: "fa-coins",         dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  transporte:  { label: "Transporte",     icon: "fa-bus",           dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  seguridad:   { label: "Seguridad",      icon: "fa-shield-alt",    dot: "bg-red-500",     badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ambiente:    { label: "Ambiente",       icon: "fa-leaf",          dot: "bg-teal-500",    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  educacion:   { label: "Educación",      icon: "fa-graduation-cap",dot: "bg-purple-500",  badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  general:     { label: "General",        icon: "fa-circle",        dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <div className="card-soft rounded-2xl p-4 border border-brand-teal/10 flex items-center gap-4 shadow-soft slide-in">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <i className={`fas ${icon} text-white text-lg`}></i>
      </div>
      <div>
        <p className="text-2xl font-bold font-serif text-brand-navy dark:text-brand-cream">{fmtNum(value)}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ── Post Card (compact) ────────────────────────────────────────────────────
function ProfilePostCard({ post, onDelete, onToggleSave, currentUserId, isSavedTab = false }) {
  const isOwner = post.user_id === currentUserId;
  const [imgOpen, setImgOpen] = useState(false);

  return (
    <>
      <article className="card-soft rounded-2xl p-4 border border-brand-teal/10 shadow-soft slide-in hover:border-brand-teal/30 transition-all">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <i className="far fa-clock"></i> {fmtDate(post.created_at)}
          </span>
          <div className="flex items-center gap-2">
            {typeof onToggleSave === "function" && (
              <button
                onClick={() => onToggleSave(post.id)}
                className="w-7 h-7 rounded-full hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors shrink-0"
                title={isSavedTab ? "Quitar de guardados" : "Guardar"}
              >
                <i className="fas fa-bookmark text-xs"></i>
              </button>
            )}
            {isOwner && !isSavedTab && (
              <button
                onClick={() => onDelete(post.id)}
                className="w-7 h-7 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shrink-0"
                title="Eliminar"
              >
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            )}
          </div>
        </div>

        {post.content && (
          <p className="text-gray-700 dark:text-gray-200 text-sm whitespace-pre-line leading-relaxed">
            {post.content}
          </p>
        )}

        {post.image_url && (
          <div
            className="mt-3 rounded-xl overflow-hidden cursor-pointer border border-brand-teal/10"
            onClick={() => setImgOpen(true)}
          >
            <img
              src={post.image_url}
              alt="Imagen"
              className="w-full max-h-48 object-cover hover:opacity-95 transition-opacity"
            />
          </div>
        )}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-brand-teal/10">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <i className="far fa-heart text-brand-terracotta"></i>
            {fmtNum(post._likes ?? 0)} likes
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <i className="far fa-comment text-brand-teal"></i>
            0 comentarios
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <i className="fas fa-retweet text-green-600"></i>
            {fmtNum(post.reposts_count ?? post._reposts ?? 0)} reposts
          </span>
        </div>
      </article>

      {imgOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setImgOpen(false)}
        >
          <button
            onClick={() => setImgOpen(false)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-brand-terracotta transition-colors z-10"
          >
            <i className="fas fa-times"></i>
          </button>
          <img
            src={post.image_url}
            alt="Imagen ampliada"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ── Meeting Card (compact) ─────────────────────────────────────────────────
function ProfileMeetingCard({ meeting, onDelete, currentUserId }) {
  const isOwner = meeting.user_id === currentUserId;
  const cat = CATEGORY_META[meeting.category] ?? CATEGORY_META.general;
  const upcoming = isUpcoming(meeting.date);

  return (
    <article className="card-soft rounded-2xl p-4 border border-brand-teal/10 shadow-soft slide-in hover:border-brand-teal/30 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cat.badge}`}>
            <i className={`fas ${cat.icon} text-[10px]`}></i>
            {cat.label}
          </span>
          {upcoming ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-brand-teal/10 text-brand-teal">
              <i className="fas fa-circle text-[6px]"></i> Próxima
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
              <i className="fas fa-check-circle text-[10px]"></i> Pasada
            </span>
          )}
        </div>
        {isOwner && (
          <button
            onClick={() => onDelete(meeting.id)}
            className="w-7 h-7 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shrink-0"
            title="Eliminar"
          >
            <i className="fas fa-trash-alt text-xs"></i>
          </button>
        )}
      </div>

      <h4 className="font-semibold text-brand-navy dark:text-brand-cream text-sm leading-snug mb-2">
        {meeting.title}
      </h4>

      {meeting.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
          {meeting.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <i className="far fa-calendar-alt text-brand-teal/60"></i>
          {fmtMeetingDate(meeting.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="far fa-clock text-brand-teal/60"></i>
          {fmtTime(meeting.time)}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="fas fa-map-marker-alt text-brand-terracotta/60"></i>
          {meeting.location}
        </span>
        {meeting.rsvp_count > 0 && (
          <span className="flex items-center gap-1.5 text-brand-terracotta">
            <i className="fas fa-users text-[10px]"></i>
            {meeting.rsvp_count} confirmados
          </span>
        )}
      </div>
    </article>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-teal/10 flex items-center justify-center">
        <i className={`fas ${icon} text-brand-teal/40 text-2xl`}></i>
      </div>
      <p className="text-gray-400 font-medium mb-1">{title}</p>
      <p className="text-gray-400/70 text-sm mb-4">{subtitle}</p>
      {action && (
        <button
          onClick={onAction}
          className="px-5 py-2 btn-warm text-white font-semibold rounded-xl text-sm"
        >
          {action}
        </button>
      )}
    </div>
  );
}

// ── Profile Page ───────────────────────────────────────────────────────────
export default function Profile() {
  const initialTab = new URLSearchParams(window.location.search).get("tab") === "guardados"
    ? "guardados"
    : "propuestas";
  const {
    user, logout,
    getPosts, deletePost, getSavedPosts, toggleSavePost,
    getMeetings, deleteMeeting,
    getMyVerificationRequest,
    updateMyCommunity,
  } = useAuth();

  const [activeTab,    setActiveTab]    = useState(initialTab);
  const [posts,        setPosts]        = useState([]);
  const [savedPosts,   setSavedPosts]   = useState([]);
  const [meetings,     setMeetings]     = useState([]);
  const [loadingP,     setLoadingP]     = useState(true);
  const [loadingS,     setLoadingS]     = useState(true);
  const [loadingM,     setLoadingM]     = useState(true);
  const [verifRequest, setVerifRequest] = useState(undefined);
  const [showVerifForm,setShowVerifForm]= useState(false);
  const [selectedVerifRole, setSelectedVerifRole] = useState("diputado");
  const [community, setCommunity] = useState(user?.community ?? "");
  const [addressReference, setAddressReference] = useState(user?.address_reference ?? "");
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [communityMsg, setCommunityMsg] = useState("");

  const initials = user?.avatar_initials ?? user?.full_name?.slice(0, 2).toUpperCase() ?? "TU";

  useEffect(() => {
    setCommunity(user?.community ?? "");
    setAddressReference(user?.address_reference ?? "");
  }, [user?.community, user?.address_reference]);

  // ── fetch verification request ────────────────────────────────────────────
  const fetchVerifRequest = useCallback(async () => {
    // Solo buscar si el usuario tiene un rol político pendiente de verificar
    const pendingRoles = ["diputado", "presidente_junta"];
    const userRole = user?.role ?? "user";
    // Mostrar si el role es político (pendiente de verificar) o si queremos ver estado
    if (!pendingRoles.includes(userRole) && userRole !== "user") return;
    try {
      const req = await getMyVerificationRequest();
      setVerifRequest(req); // null si no hay solicitud
    } catch (_) {
      setVerifRequest(null);
    }
  }, [getMyVerificationRequest, user?.role]);

  // toggleDark viene importado de App.jsx — persiste en localStorage

  // ── fetch my posts ────────────────────────────────────────────────────────
  const fetchMyPosts = useCallback(async () => {
    setLoadingP(true);
    try {
      const all = await getPosts();
      // Filter only current user's posts
      setPosts(
        all
          .filter(p => p.user_id === user?.id)
          .map(p => ({
            ...p,
            _liked: p.user_has_liked ?? false,
            _likes: p.likes_count ?? 0,
            _reposts: p.reposts_count ?? 0,
            _saved: p.user_has_saved ?? false,
          }))
      );
    } catch (_) {}
    setLoadingP(false);
  }, [getPosts, user?.id]);

  const fetchSavedPosts = useCallback(async () => {
    setLoadingS(true);
    try {
      const all = await getSavedPosts();
      setSavedPosts(
        (all ?? []).map(p => ({
          ...p,
          _liked: p.user_has_liked ?? false,
          _likes: p.likes_count ?? 0,
          _reposts: p.reposts_count ?? 0,
          _saved: p.user_has_saved ?? true,
        }))
      );
    } catch (_) {}
    setLoadingS(false);
  }, [getSavedPosts]);

  // ── fetch my meetings ─────────────────────────────────────────────────────
  const fetchMyMeetings = useCallback(async () => {
    setLoadingM(true);
    try {
      const all = await getMeetings();
      setMeetings((all ?? []).filter(m => m.user_id === user?.id));
    } catch (_) {}
    setLoadingM(false);
  }, [getMeetings, user?.id]);

  useEffect(() => {
    fetchMyPosts();
    fetchSavedPosts();
    fetchMyMeetings();
    fetchVerifRequest();
  }, [fetchMyPosts, fetchSavedPosts, fetchMyMeetings, fetchVerifRequest]);

  async function handleDeletePost(postId) {
    try {
      await deletePost(postId);
      setPosts(p => p.filter(post => post.id !== postId));
      setSavedPosts(p => p.filter(post => post.id !== postId));
    } catch (_) {}
  }

  async function handleToggleSaved(postId) {
    try {
      const { saved } = await toggleSavePost(postId);
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, _saved: saved } : post));
      if (saved) {
        fetchSavedPosts();
      } else {
        setSavedPosts(prev => prev.filter(post => post.id !== postId));
      }
    } catch (_) {}
  }

  async function handleDeleteMeeting(meetingId) {
    try {
      await deleteMeeting(meetingId);
      setMeetings(m => m.filter(meet => meet.id !== meetingId));
    } catch (_) {}
  }

  async function handleSaveCommunity() {
    if (!community.trim()) {
      setCommunityMsg("La comunidad principal es requerida");
      return;
    }
    setSavingCommunity(true);
    setCommunityMsg("");
    try {
      await updateMyCommunity(community, addressReference);
      setCommunityMsg("Comunidad actualizada correctamente");
    } catch (err) {
      setCommunityMsg(err.message || "No se pudo actualizar la comunidad");
    }
    setSavingCommunity(false);
  }

  const upcomingMeetings = meetings.filter(m => isUpcoming(m.date));
  const pastMeetings     = meetings.filter(m => !isUpcoming(m.date));

  const TABS = [
    { id: "propuestas", label: "Propuestas",   icon: "fa-bullhorn",      count: posts.length },
    { id: "guardados",  label: "Guardados",    icon: "fa-bookmark",      count: savedPosts.length },
    { id: "agenda",     label: "Mis Agendas",  icon: "fa-calendar-alt",  count: meetings.length },
  ];

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="w-9 h-9 rounded-xl bg-brand-cream dark:bg-brand-navy/50 flex items-center justify-center hover:bg-brand-teal/10 transition-colors border border-brand-teal/20 text-brand-navy dark:text-brand-cream"
              title="Volver al inicio"
            >
              <i className="fas fa-arrow-left text-sm"></i>
            </a>
            <div className="flex items-center gap-2">
              <i className="fas fa-landmark text-brand-teal text-xl"></i>
              <span className="font-serif font-bold text-brand-navy dark:text-brand-cream text-lg hidden sm:block">
                Mi Perfil
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavMenu currentPath="/perfil" />
          </div>
        </div>
      </header>

      <main className="pt-20 pb-24 md:pb-10">
        <div className="max-w-4xl mx-auto px-4 space-y-5">

          {/* ── Profile Hero ────────────────────────────────────────────── */}
          <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft overflow-hidden slide-in">
            {/* Cover */}
            <div className="h-28 gradient-bg relative">
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }}
              />
            </div>

            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="flex items-end justify-between -mt-10 mb-4">
                <div className="w-20 h-20 rounded-2xl avatar-teal flex items-center justify-center text-white font-bold text-2xl border-4 border-white dark:border-brand-navy shadow-lg">
                  {initials}
                </div>
                <a
                  href="/agenda"
                  className="mb-1 px-4 py-2 rounded-xl border border-brand-teal text-brand-teal text-sm font-semibold hover:bg-brand-teal hover:text-white transition-all"
                >
                  <i className="fas fa-calendar-plus mr-2"></i>Nueva agenda
                </a>
              </div>

              {/* Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">
                    {user?.full_name ?? "Usuario"}
                  </h2>
                  <RoleBadge role={user?.role} verified={user?.verified} />
                </div>
                <p className="text-brand-teal text-sm font-medium">@{user?.username ?? "usuario"}</p>
                {user?.email && (
                  <p className="text-gray-400 text-sm flex items-center gap-1.5">
                    <i className="fas fa-envelope text-xs"></i>
                    {user.email}
                  </p>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 flex items-center gap-1.5">
                  <i className="fas fa-landmark text-brand-teal/60 text-xs"></i>
                  Ciudadano activo del Portal
                </p>
              </div>
            </div>
          </div>

          {/* ── Verificación de rol político ────────────────────────────── */}
          {/* Solo mostrar si hay una solicitud existente (pendiente o rechazada) */}
          {!showVerifForm && user?.role !== "super_admin" &&
           user?.role !== "diputado" && user?.role !== "presidente_junta" &&
           verifRequest !== null && verifRequest !== undefined && (
            <VerificationBanner
              request={verifRequest}
              roleType={verifRequest?.requested_role ?? null}
              onStartForm={(role) => {
                setSelectedVerifRole(role);
                setShowVerifForm(true);
              }}
            />
          )}

          {/* Si ya tiene rol aprobado, mostrar badge de estado */}
          {!showVerifForm && (user?.role === "diputado" || user?.role === "presidente_junta") && (
            <div className={`flex items-center gap-3 p-4 rounded-2xl border slide-in ${
              user.role === "diputado"
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            }`}>
              <i className={`fas ${user.role === "diputado" ? "fa-star text-amber-500" : "fa-home text-green-600"} text-xl shrink-0`}></i>
              <div>
                <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream">
                  {user.role === "diputado" ? "Diputado verificado" : "Presidente de Junta verificado"}
                </p>
                <p className="text-xs text-gray-500">Tu rol ha sido verificado por el administrador.</p>
              </div>
              <i className="fas fa-check-circle text-green-500 ml-auto text-lg"></i>
            </div>
          )}

          {showVerifForm && (
            <VerificationForm
              roleType={selectedVerifRole || verifRequest?.requested_role || "diputado"}
              onSuccess={() => {
                setShowVerifForm(false);
                fetchVerifRequest();
              }}
              onCancel={() => setShowVerifForm(false)}
            />
          )}

          {/* ── Stats Row ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon="fa-bullhorn"
              label="Propuestas"
              value={posts.length}
              color="gradient-bg-warm"
            />
            <StatCard
              icon="fa-calendar-check"
              label="Agendas creadas"
              value={meetings.length}
              color="gradient-bg"
            />
            <StatCard
              icon="fa-bookmark"
              label="Guardados"
              value={savedPosts.length}
              color="avatar-teal"
            />
            <StatCard
              icon="fa-calendar-alt"
              label="Próximas"
              value={upcomingMeetings.length}
              color="avatar-navy"
            />
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft overflow-hidden slide-in">
            {/* Tab Headers */}
            <div className="flex border-b border-brand-teal/10">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all relative ${
                    activeTab === tab.id
                      ? "text-brand-teal"
                      : "text-gray-400 hover:text-brand-navy dark:hover:text-brand-cream"
                  }`}
                >
                  <i className={`fas ${tab.icon} text-sm`}></i>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id
                      ? "bg-brand-teal text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}>
                    {tab.count}
                  </span>
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-teal rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4">

              {/* ── Propuestas Tab ──────────────────────────────────────── */}
              {activeTab === "propuestas" && (
                <div>
                  {loadingP ? (
                    <div className="py-10 flex flex-col items-center gap-3 text-brand-teal/60">
                      <i className="fas fa-spinner fa-spin text-2xl"></i>
                      <span className="text-sm">Cargando propuestas...</span>
                    </div>
                  ) : posts.length === 0 ? (
                    <EmptyState
                      icon="fa-bullhorn"
                      title="Aún no has publicado nada"
                      subtitle="Comparte tus propuestas e ideas con la ciudadanía"
                      action="Crear propuesta"
                      onAction={() => window.location.href = "/"}
                    />
                  ) : (
                    <div className="space-y-3">
                      {posts.map(post => (
                        <ProfilePostCard
                          key={post.id}
                          post={post}
                          currentUserId={user?.id}
                          onDelete={handleDeletePost}
                          onToggleSave={handleToggleSaved}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Agenda Tab ──────────────────────────────────────────── */}
              {activeTab === "guardados" && (
                <div>
                  {loadingS ? (
                    <div className="py-10 flex flex-col items-center gap-3 text-brand-teal/60">
                      <i className="fas fa-spinner fa-spin text-2xl"></i>
                      <span className="text-sm">Cargando guardados...</span>
                    </div>
                  ) : savedPosts.length === 0 ? (
                    <EmptyState
                      icon="fa-bookmark"
                      title="No has guardado posts"
                      subtitle="Cuando guardes publicaciones aparecerán aquí."
                      action="Ir al inicio"
                      onAction={() => window.location.href = "/"}
                    />
                  ) : (
                    <div className="space-y-3">
                      {savedPosts.map(post => (
                        <ProfilePostCard
                          key={post.id}
                          post={post}
                          currentUserId={user?.id}
                          onDelete={handleDeletePost}
                          onToggleSave={handleToggleSaved}
                          isSavedTab
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "agenda" && (
                <div className="space-y-5">
                  {loadingM ? (
                    <div className="py-10 flex flex-col items-center gap-3 text-brand-teal/60">
                      <i className="fas fa-spinner fa-spin text-2xl"></i>
                      <span className="text-sm">Cargando agendas...</span>
                    </div>
                  ) : meetings.length === 0 ? (
                    <EmptyState
                      icon="fa-calendar-alt"
                      title="No has convocado reuniones"
                      subtitle="Organiza una reunión ciudadana para tu comunidad"
                      action="Convocar reunión"
                      onAction={() => window.location.href = "/agenda"}
                    />
                  ) : (
                    <>
                      {upcomingMeetings.length > 0 && (
                        <section>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal mb-3 flex items-center gap-2">
                            <i className="fas fa-clock"></i> Próximas ({upcomingMeetings.length})
                          </h3>
                          <div className="space-y-3">
                            {upcomingMeetings.map(m => (
                              <ProfileMeetingCard
                                key={m.id}
                                meeting={m}
                                currentUserId={user?.id}
                                onDelete={handleDeleteMeeting}
                              />
                            ))}
                          </div>
                        </section>
                      )}

                      {pastMeetings.length > 0 && (
                        <section>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                            <i className="fas fa-history"></i> Realizadas ({pastMeetings.length})
                          </h3>
                          <div className="space-y-3 opacity-75">
                            {pastMeetings.map(m => (
                              <ProfileMeetingCard
                                key={m.id}
                                meeting={m}
                                currentUserId={user?.id}
                                onDelete={handleDeleteMeeting}
                              />
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile Nav ──────────────────────────────────────────────────── */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 card-soft shadow-soft border-t border-brand-teal/20 px-6 py-3 justify-around items-center z-50">
        <a href="/" className="flex flex-col items-center gap-1 text-brand-navy/50 dark:text-brand-cream/50 hover:text-brand-teal">
          <i className="fas fa-home text-xl"></i>
          <span className="text-xs">Inicio</span>
        </a>
        <a href="/agenda" className="flex flex-col items-center gap-1 text-brand-navy/50 dark:text-brand-cream/50 hover:text-brand-teal">
          <i className="fas fa-calendar-alt text-xl"></i>
          <span className="text-xs">Agenda</span>
        </a>
        <a href="/perfil" className="flex flex-col items-center gap-1 text-brand-teal">
          <i className="fas fa-user text-xl"></i>
          <span className="text-xs font-semibold">Perfil</span>
        </a>
        <button onClick={logout} className="flex flex-col items-center gap-1 text-brand-navy/50 dark:text-brand-cream/50 hover:text-red-500">
          <i className="fas fa-sign-out-alt text-xl"></i>
          <span className="text-xs">Salir</span>
        </button>
      </nav>
    </div>
  );
}
