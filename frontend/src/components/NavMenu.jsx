import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { toggleDark } from "../App";

const NAV_ITEMS = [
  { icon: "fa-home", label: "Inicio", href: "/" },
  { icon: "fa-calendar-alt", label: "Agenda", href: "/agenda" },
  { icon: "fa-bullhorn", label: "Propuestas", href: "/propuestas" },
  { icon: "fa-triangle-exclamation", label: "Denuncias", href: "/denuncias" },
  { icon: "fa-bolt", label: "Servicios", href: "/solicitudes-servicios" },
  { icon: "fa-poll", label: "Encuestas", href: "/encuestas" },
  { icon: "fa-users", label: "Foros", href: "/foros" },
  { icon: "fa-map-marked-alt", label: "Zonas", href: "/zonas" },
  { icon: "fa-book", label: "Biblioteca", href: "/biblioteca" },
  { icon: "fa-user", label: "Mi Perfil", href: "/perfil" },
  { icon: "fa-landmark", label: "Instituciones", href: "#" },
  { icon: "fa-bell", label: "Notificaciones", href: "/notificaciones" },
  { icon: "fa-bookmark", label: "Guardados", href: "/perfil?tab=guardados" },
];

const ADMIN_ITEM = { icon: "fa-shield-alt", label: "Panel Admin", href: "/admin" };

export default function NavMenu({ currentPath = "/" }) {
  const { user, logout, getUnreadNotificationsCount } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const initials = user?.avatar_initials ?? user?.full_name?.slice(0, 2).toUpperCase() ?? "TU";

  useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    let active = true;

    async function loadUnread() {
      try {
        const count = await getUnreadNotificationsCount();
        if (active) setUnreadCount(count);
      } catch {
        if (active) setUnreadCount(0);
      }
    }

    loadUnread();
    return () => {
      active = false;
    };
  }, [currentPath, getUnreadNotificationsCount]);

  const items = user?.role === "super_admin" ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;
  const menuContent = open ? (
    <>
      <button
        type="button"
        aria-label="Cerrar menu"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[190] bg-brand-navy/55 backdrop-blur-sm md:hidden"
      />

      <div className="fixed inset-x-3 top-[76px] bottom-20 z-[200] rounded-2xl border border-brand-teal/15 bg-brand-cream shadow-2xl slide-in dark:bg-brand-navy md:absolute md:inset-auto md:right-4 md:top-16 md:h-auto md:w-72 md:max-w-none md:rounded-2xl md:border md:bg-brand-cream/95 md:dark:bg-brand-navy/95">
        <div className="flex h-full flex-col overflow-hidden md:max-h-[80vh]">
          <div className="flex items-center justify-between border-b border-brand-teal/10 bg-white/70 px-4 py-4 dark:bg-white/5 md:hidden">
            <div>
              <p className="font-serif font-bold text-brand-navy dark:text-brand-cream">Menu</p>
              <p className="text-xs text-gray-500">Acceso a todos los modulos</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-10 h-10 rounded-xl border border-brand-teal/20 bg-brand-cream dark:bg-brand-navy/50 text-brand-navy dark:text-brand-cream"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="border-b border-brand-teal/10 bg-brand-cream/80 p-4 dark:bg-brand-navy/80">
            <a
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 group"
            >
              <div className="w-11 h-11 rounded-full avatar-teal flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-brand-terracotta/30 group-hover:ring-brand-teal/50 transition-all">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream truncate">
                    {user?.full_name ?? "Usuario"}
                  </p>
                  {user?.role === "super_admin" && (
                    <i className="fas fa-shield-alt text-gray-800 dark:text-white text-xs shrink-0"></i>
                  )}
                  {user?.role !== "super_admin" && user?.verified && (
                    <i className="fas fa-check-circle text-brand-teal text-xs shrink-0"></i>
                  )}
                </div>
                <p className="text-xs text-brand-teal">@{user?.username ?? "usuario"}</p>
              </div>
              <i className="fas fa-chevron-right text-gray-300 text-xs group-hover:text-brand-teal transition-colors"></i>
            </a>
          </div>

          <nav className="flex-1 overflow-y-auto bg-brand-cream p-2 dark:bg-brand-navy">
            {items.map((item) => {
              const isActive = currentPath === item.href;
              const isDisabled = item.href === "#";

              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => !isDisabled && setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm ${
                    isActive
                      ? "bg-brand-teal/10 text-brand-teal font-semibold"
                      : isDisabled
                      ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      : item.label === "Panel Admin"
                      ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                      : "text-brand-navy dark:text-brand-cream hover:bg-brand-teal/5"
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-brand-teal text-white"
                      : item.label === "Panel Admin"
                      ? "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                      : "bg-brand-cream dark:bg-brand-navy/50 text-brand-teal"
                  }`}>
                    <i className={`fas ${item.icon} text-xs`}></i>
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>}
                  {item.label === "Notificaciones" && unreadCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand-terracotta text-white text-[10px] font-bold flex items-center justify-center">
                      {Math.min(unreadCount, 99)}
                    </span>
                  )}
                  {isDisabled && (
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">Proximamente</span>
                  )}
                </a>
              );
            })}
          </nav>

          <div className="border-t border-brand-teal/10 bg-brand-cream p-2 dark:bg-brand-navy">
            <button
              onClick={toggleDark}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-brand-navy dark:text-brand-cream hover:bg-brand-teal/5 transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-brand-cream dark:bg-brand-navy/50 flex items-center justify-center shrink-0">
                <i className="fas fa-moon dark:hidden text-brand-navy text-xs"></i>
                <i className="fas fa-sun hidden dark:block text-brand-terracotta text-xs"></i>
              </span>
              <span className="dark:hidden">Modo oscuro</span>
              <span className="hidden dark:block">Modo claro</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                <i className="fas fa-sign-out-alt text-xs"></i>
              </span>
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
          open
            ? "bg-brand-teal text-white border-brand-teal"
            : "bg-brand-cream dark:bg-brand-navy/50 border-brand-teal/20 text-brand-navy dark:text-brand-cream hover:bg-brand-teal/10"
        }`}
        title="Menu de navegacion"
        aria-label="Abrir menu"
        aria-expanded={open}
      >
        <div className="flex flex-col gap-1.5 w-4">
          <span className={`block h-0.5 bg-current rounded-full transition-all duration-300 origin-center ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 bg-current rounded-full transition-all duration-300 ${open ? "opacity-0 scale-x-0" : ""}`} />
          <span className={`block h-0.5 bg-current rounded-full transition-all duration-300 origin-center ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </div>
      </button>

      {menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
