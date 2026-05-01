import { useEffect, useMemo, useState } from "react";
import NavMenu from "../components/NavMenu";
import { useAuth } from "../context/AuthContext";

function fmtDate(iso) {
  const date = new Date(iso);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return date.toLocaleDateString("es-DO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function notificationStyle(type) {
  switch (type) {
    case "like":
      return { icon: "fa-heart", color: "text-brand-terracotta", bg: "bg-brand-terracotta/10" };
    case "comment":
      return { icon: "fa-comment", color: "text-brand-teal", bg: "bg-brand-teal/10" };
    case "repost":
      return { icon: "fa-retweet", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20" };
    case "save":
      return { icon: "fa-bookmark", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/20" };
    case "proposal":
      return { icon: "fa-bullhorn", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/20" };
    case "report":
      return { icon: "fa-triangle-exclamation", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/20" };
    case "service_request":
      return { icon: "fa-bolt", color: "text-brand-teal", bg: "bg-brand-teal/10" };
    case "meeting":
      return { icon: "fa-calendar-check", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20" };
    case "campaign":
      return { icon: "fa-bullseye", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20" };
    default:
      return { icon: "fa-bell", color: "text-brand-navy", bg: "bg-brand-cream dark:bg-brand-navy/40" };
  }
}

function notificationHref(item) {
  const type = item.entity_type || item.type;
  switch (type) {
    case "proposal":
      return "/propuestas";
    case "report":
      return "/denuncias";
    case "service_request":
      return "/solicitudes-servicios";
    case "meeting":
      return "/agenda";
    case "campaign":
      return "/";
    default:
      return "";
  }
}

export default function Notificaciones() {
  const { user, getNotifications, markNotificationsAsRead } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await getNotifications();
        if (!active) return;
        setNotifications(items);
        if (items.some(item => !item.read)) {
          await markNotificationsAsRead();
          if (!active) return;
          setNotifications(prev => prev.map(item => ({ ...item, read: true })));
        }
      } catch (err) {
        if (active) setError(err.message || "No se pudieron cargar las notificaciones");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [getNotifications, markNotificationsAsRead]);

  const unreadCount = useMemo(
    () => notifications.filter(item => !item.read).length,
    [notifications]
  );

  async function handleMarkAll() {
    setMarking(true);
    try {
      await markNotificationsAsRead();
      setNotifications(prev => prev.map(item => ({ ...item, read: true })));
    } catch (err) {
      setError(err.message || "No se pudieron actualizar las notificaciones");
    } finally {
      setMarking(false);
    }
  }

  const initials = user?.avatar_initials ?? user?.full_name?.slice(0, 2).toUpperCase() ?? "TU";

  return (
    <div className="min-h-screen bg-mesh dark:bg-brand-navy">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-brand-navy/80 border-b border-brand-teal/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl gradient-bg flex items-center justify-center shadow-soft">
              <i className="fas fa-landmark text-white text-lg"></i>
            </div>
            <div>
              <h1 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">Portal Ciudadano</h1>
              <p className="text-xs text-brand-teal">Tus interacciones recientes</p>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a href="/perfil" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 dark:bg-brand-navy/50 border border-brand-teal/15">
              <div className="w-9 h-9 rounded-full avatar-teal flex items-center justify-center text-white font-bold text-sm">{initials}</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-brand-navy dark:text-brand-cream">{user?.full_name ?? "Usuario"}</p>
                <p className="text-xs text-brand-teal">@{user?.username ?? "usuario"}</p>
              </div>
            </a>
            <NavMenu currentPath="/notificaciones" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <section className="card-soft rounded-3xl border border-brand-teal/10 shadow-soft overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-brand-teal/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-teal font-semibold">Apartado</p>
              <h2 className="font-serif font-bold text-2xl text-brand-navy dark:text-brand-cream">Notificaciones</h2>
              <p className="text-sm text-gray-500">
                {unreadCount > 0 ? `${unreadCount} sin leer` : "Todas tus notificaciones estan al dia"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/"
                className="px-4 py-2 rounded-xl border border-brand-teal/20 text-brand-navy dark:text-brand-cream hover:bg-brand-teal/5 transition-colors"
              >
                Volver al inicio
              </a>
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={marking || notifications.length === 0}
                className="px-4 py-2 rounded-xl btn-warm text-white font-semibold disabled:opacity-50"
              >
                {marking ? "Marcando..." : "Marcar todas"}
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map(item => (
                  <div key={item} className="h-24 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/10 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="py-14 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-teal/10 text-brand-teal flex items-center justify-center text-2xl mb-4">
                  <i className="fas fa-bell"></i>
                </div>
                <h3 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">Aun no tienes notificaciones</h3>
                <p className="text-sm text-gray-500 mt-2">Cuando alguien interactue con tus publicaciones, aparecera aqui.</p>
              </div>
            )}

            {!loading && !error && notifications.length > 0 && (
              <div className="space-y-3">
                {notifications.map(item => {
                  const style = notificationStyle(item.type);
                  const href = notificationHref(item);
                  return (
                    <article
                      key={item.id}
                      className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                        item.read
                          ? "border-brand-teal/10 bg-white/70 dark:bg-brand-navy/30"
                          : "border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full avatar-teal flex items-center justify-center text-white font-bold">
                            {item.actor_initials || "US"}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${style.bg} ${style.color} flex items-center justify-center border-2 border-white dark:border-brand-navy`}>
                            <i className={`fas ${style.icon} text-xs`}></i>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <div>
                              <h3 className="font-semibold text-brand-navy dark:text-brand-cream">{item.title}</h3>
                              <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{item.message}</p>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{fmtDate(item.created_at)}</span>
                          </div>

                          {item.post_excerpt && (
                            <div className="mt-3 rounded-xl bg-brand-cream dark:bg-brand-navy/50 border border-brand-teal/10 px-3 py-2">
                              <p className="text-xs uppercase tracking-[0.18em] text-brand-teal font-semibold mb-1">Publicacion</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{item.post_excerpt}</p>
                            </div>
                          )}

                          {href && (
                            <div className="mt-3">
                              <a href={href} className="inline-flex items-center gap-2 rounded-xl border border-brand-teal/20 px-3 py-2 text-xs font-semibold text-brand-teal hover:bg-brand-teal/10">
                                <i className="fas fa-arrow-right"></i>
                                Abrir apartado
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
