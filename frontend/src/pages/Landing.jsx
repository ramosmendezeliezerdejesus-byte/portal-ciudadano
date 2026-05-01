import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toggleDark } from "../App";

const NAV_ITEMS = [
  { label: "Que es", href: "#que-es" },
  { label: "Como usarlo", href: "#como-usarlo" },
  { label: "Modulos", href: "#modulos" },
  { label: "Beneficios", href: "#beneficios" },
];

const FEATURE_CARDS = [
  {
    icon: "fa-bullhorn",
    title: "Propuestas ciudadanas",
    text: "Publica ideas para mejorar tu comunidad, recibe apoyo y deja trazabilidad de cada iniciativa.",
  },
  {
    icon: "fa-triangle-exclamation",
    title: "Denuncias con evidencias",
    text: "Reporta riesgos o irregularidades con fotos, videos y documentos que ayuden a validar el caso.",
  },
  {
    icon: "fa-bolt",
    title: "Solicitudes de servicios",
    text: "Canaliza problemas de agua, alumbrado, basura, calles y otros servicios publicos desde un mismo lugar.",
  },
  {
    icon: "fa-users",
    title: "Foros por comunidad",
    text: "Organiza conversaciones locales y abre subforos para debatir seguridad, limpieza, movilidad o cualquier tema del sector.",
  },
  {
    icon: "fa-calendar-check",
    title: "Agenda y reuniones",
    text: "Convoca encuentros, confirma asistencia y mantén a la comunidad alineada con actividades reales.",
  },
  {
    icon: "fa-bell",
    title: "Notificaciones segmentadas",
    text: "Recibe solo avisos relevantes segun tu comunidad y los temas que realmente te interesan.",
  },
];

const HOW_TO_USE = [
  {
    title: "Crea tu cuenta",
    text: "Registrate con nombre, correo, comunidad principal y una referencia de ubicacion para relacionarte con tu zona.",
  },
  {
    title: "Confirma tu correo",
    text: "La confirmacion habilita acciones como publicar, comentar, votar y enviar reportes con adjuntos.",
  },
  {
    title: "Configura tus intereses",
    text: "Selecciona temas y elige si quieres recibir notificaciones filtradas por sector y tipo de actividad.",
  },
  {
    title: "Participa con evidencias",
    text: "Publica propuestas, denuncias o solicitudes, adjunta archivos y deja un historial claro del caso.",
  },
  {
    title: "Da seguimiento",
    text: "Consulta el estado, comenta, apoya iniciativas, responde encuestas y revisa notificaciones o reuniones proximas.",
  },
];

const ROLE_CARDS = [
  {
    badge: "Ciudadania",
    title: "Participacion abierta",
    text: "Los vecinos pueden reportar, apoyar, opinar, entrar a foros y mantenerse informados sin depender de grupos dispersos.",
  },
  {
    badge: "Roles verificados",
    title: "Gestion con trazabilidad",
    text: "Diputados y presidentes de junta pueden gestionar casos, cerrar incidencias con evidencias y convocar reuniones.",
  },
  {
    badge: "Administracion",
    title: "Control centralizado",
    text: "El super administrador revisa verificaciones, usuarios, campanas y reportes exportables para toma de decisiones.",
  },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-mesh text-gray-800 dark:text-gray-100">
      <header className="sticky top-0 z-50 border-b border-brand-teal/10 bg-brand-cream/90 backdrop-blur-xl dark:bg-brand-navy/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-bg shadow-soft">
              <i className="fas fa-landmark text-white text-lg"></i>
            </div>
            <div>
              <p className="font-serif text-lg font-bold text-brand-navy dark:text-brand-cream">Portal Ciudadano</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Participacion, gestion y seguimiento comunitario</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className="text-sm font-semibold text-brand-navy transition-colors hover:text-brand-teal dark:text-brand-cream dark:hover:text-brand-teal">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              onClick={toggleDark}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-teal/20 bg-white/70 text-brand-navy transition-colors hover:bg-brand-teal/10 dark:bg-brand-navy/40 dark:text-brand-cream"
              aria-label="Cambiar tema"
            >
              <i className="fas fa-moon dark:hidden"></i>
              <i className="fas fa-sun hidden dark:block text-brand-teal"></i>
            </button>
            <Link to="/login" className="rounded-2xl border border-brand-teal/20 px-4 py-2.5 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-teal/10 dark:text-brand-cream">
              Iniciar sesion
            </Link>
            <Link to="/registro" className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white btn-primary">
              Crear cuenta
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={toggleDark}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-teal/20 bg-white/70 text-brand-navy transition-colors hover:bg-brand-teal/10 dark:bg-brand-navy/40 dark:text-brand-cream"
              aria-label="Cambiar tema"
            >
              <i className="fas fa-moon dark:hidden text-sm"></i>
              <i className="fas fa-sun hidden dark:block text-brand-teal text-sm"></i>
            </button>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                menuOpen
                  ? "border-brand-teal bg-brand-teal text-white"
                  : "border-brand-teal/20 bg-white/70 text-brand-navy hover:bg-brand-teal/10 dark:bg-brand-navy/40 dark:text-brand-cream"
              }`}
              aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
            >
              <div className="flex w-4 flex-col gap-1.5">
                <span className={`block h-0.5 rounded-full bg-current transition-all ${menuOpen ? "translate-y-2 rotate-45" : ""}`}></span>
                <span className={`block h-0.5 rounded-full bg-current transition-all ${menuOpen ? "scale-x-0 opacity-0" : ""}`}></span>
                <span className={`block h-0.5 rounded-full bg-current transition-all ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}></span>
              </div>
            </button>
          </div>
        </div>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Cerrar menu"
              onClick={closeMenu}
              className="fixed inset-0 top-[69px] z-[80] bg-brand-navy/45 backdrop-blur-sm lg:hidden"
            />
            <div className="fixed inset-x-3 top-[76px] z-[90] rounded-2xl border border-brand-teal/10 bg-brand-cream/98 px-4 pb-4 pt-3 shadow-soft-xl dark:bg-brand-navy/98 lg:hidden">
              <div className="space-y-2">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex items-center justify-between rounded-xl border border-brand-teal/10 bg-white/80 px-4 py-3 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-teal/10 dark:bg-brand-navy/50 dark:text-brand-cream"
                  >
                    <span>{item.label}</span>
                    <i className="fas fa-arrow-right text-xs text-brand-teal"></i>
                  </a>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to="/login" onClick={closeMenu} className="rounded-xl border border-brand-teal/20 px-4 py-3 text-center text-sm font-semibold text-brand-navy dark:text-brand-cream">
                  Iniciar sesion
                </Link>
                <Link to="/registro" onClick={closeMenu} className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-white btn-primary">
                  Crear cuenta
                </Link>
              </div>
            </div>
          </>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:pt-16">
          <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top_left,rgba(99,189,181,0.35),transparent_42%),radial-gradient(circle_at_85%_15%,rgba(21,105,111,0.22),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(238,242,240,0))] dark:bg-[radial-gradient(circle_at_top_left,rgba(99,189,181,0.22),transparent_42%),radial-gradient(circle_at_85%_15%,rgba(21,105,111,0.24),transparent_28%),linear-gradient(180deg,rgba(20,24,24,0.82),rgba(26,31,30,0))]"></div>
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-teal/20 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-teal shadow-soft dark:bg-brand-navy/40">
                <span className="h-2 w-2 rounded-full bg-brand-teal"></span>
                Participacion organizada para comunidades reales
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl font-serif text-4xl font-bold leading-tight text-brand-navy dark:text-brand-cream sm:text-5xl lg:text-6xl">
                  La voz de tu comunidad en una plataforma que sí da seguimiento.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-gray-600 dark:text-gray-300 sm:text-lg">
                  Portal Ciudadano conecta a vecinos, representantes y administradores para publicar propuestas, denunciar
                  problemas, solicitar servicios, organizar reuniones y recibir informacion util segun el sector de cada usuario.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/registro" className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white btn-primary">
                  <i className="fas fa-user-plus"></i>
                  Crear cuenta ahora
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-teal/20 bg-white/70 px-6 py-3.5 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-teal/10 dark:bg-brand-navy/40 dark:text-brand-cream">
                  <i className="fas fa-arrow-right-to-bracket"></i>
                  Entrar al portal
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["fa-file-circle-check", "Reportes claros", "Casos con evidencias y estado"],
                  ["fa-bell", "Avisos utiles", "Filtrados por zona y tema"],
                  ["fa-chart-line", "Gestion visible", "Seguimiento y exportes"],
                ].map(([icon, title, text]) => (
                  <div key={title} className="rounded-2xl border border-brand-teal/10 bg-white/70 p-4 shadow-soft dark:bg-brand-navy/35">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                      <i className={`fas ${icon}`}></i>
                    </div>
                    <p className="font-semibold text-brand-navy dark:text-brand-cream">{title}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[28px] border border-brand-teal/10 bg-white/80 p-5 shadow-soft-xl dark:bg-brand-navy/45">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Panel de actividad</p>
                    <h2 className="mt-2 font-serif text-2xl font-bold text-brand-navy dark:text-brand-cream">
                      Todo lo importante en un solo lugar
                    </h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-soft">
                    <i className="fas fa-wave-square text-white"></i>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-brand-teal/10 bg-brand-cream/90 p-4 dark:bg-brand-navy/45">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal">
                        <i className="fas fa-triangle-exclamation"></i>
                        Denuncia prioritaria
                      </span>
                      <span className="text-xs text-gray-400">Actualizada hace 12m</span>
                    </div>
                    <p className="font-semibold text-brand-navy dark:text-brand-cream">Falta de alumbrado y cableado en la calle principal</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      El caso concentra evidencias, apoyos de vecinos y una respuesta formal del equipo gestor.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-brand-teal/10 bg-white/80 p-4 dark:bg-brand-navy/35">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Comunidad</p>
                      <p className="mt-2 text-xl font-bold text-brand-navy dark:text-brand-cream">Foros activos</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Espacios por sector para debatir seguridad, basura, agua y otros temas.</p>
                    </div>
                    <div className="rounded-2xl border border-brand-teal/10 bg-white/80 p-4 dark:bg-brand-navy/35">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Seguimiento</p>
                      <p className="mt-2 text-xl font-bold text-brand-navy dark:text-brand-cream">Adjuntos multiples</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Fotos, videos, PDF y Word en propuestas, denuncias y solicitudes.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-brand-teal/10 bg-gradient-to-r from-brand-teal/10 via-transparent to-brand-terracotta/10 p-4">
                    <p className="text-sm font-semibold text-brand-navy dark:text-brand-cream">
                      Ideal para alcaldias, juntas de vecinos, equipos comunitarios y representantes que necesitan orden, evidencia y participacion.
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 hidden h-24 w-24 rounded-[28px] border border-brand-teal/20 bg-white/70 shadow-soft dark:bg-brand-navy/35 lg:block"></div>
            </div>
          </div>
        </section>

        <section id="que-es" className="px-4 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Que es el proyecto</p>
                <h2 className="mt-3 font-serif text-3xl font-bold text-brand-navy dark:text-brand-cream sm:text-4xl">
                  Una plataforma para convertir quejas dispersas en gestion organizada.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400 sm:text-base">
                En lugar de depender de mensajes perdidos o grupos informales, Portal Ciudadano centraliza incidencias,
                propuestas y comunicaciones en un flujo claro para la comunidad y para quienes gestionan respuestas.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {FEATURE_CARDS.map((card, index) => (
                <article
                  key={card.title}
                  className={`rounded-[26px] border p-5 shadow-soft transition-transform hover:-translate-y-1 ${
                    index % 3 === 0
                      ? "border-brand-teal/20 bg-white/80 dark:bg-brand-navy/35"
                      : index % 3 === 1
                      ? "border-brand-teal/10 bg-brand-cream/90 dark:bg-brand-navy/45"
                      : "border-brand-teal/10 bg-gradient-to-br from-white/90 to-brand-teal/10 dark:from-brand-navy/45 dark:to-brand-teal/10"
                  }`}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-soft">
                    <i className={`fas ${card.icon} text-white`}></i>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-brand-navy dark:text-brand-cream">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-usarlo" className="px-4 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Como usarlo</p>
              <h2 className="mt-3 font-serif text-3xl font-bold text-brand-navy dark:text-brand-cream sm:text-4xl">
                Empezar es simple y el seguimiento queda visible.
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.88fr,1.12fr]">
              <div className="rounded-[28px] border border-brand-teal/10 bg-white/75 p-6 shadow-soft dark:bg-brand-navy/35">
                <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                  El uso recomendado sigue el mismo enfoque del manual de usuario: primero registrarte, luego confirmar el
                  correo, configurar intereses y finalmente participar con publicaciones, propuestas, denuncias o solicitudes.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    ["fa-location-dot", "Tu comunidad define tus foros y notificaciones locales."],
                    ["fa-folder-open", "Puedes adjuntar varios archivos en una misma incidencia o propuesta."],
                    ["fa-check-double", "Los estados permiten saber si un caso fue recibido, gestionado o resuelto."],
                  ].map(([icon, text]) => (
                    <div key={text} className="flex items-start gap-3 rounded-2xl border border-brand-teal/10 bg-brand-cream/90 p-4 dark:bg-brand-navy/40">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                        <i className={`fas ${icon}`}></i>
                      </div>
                      <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {HOW_TO_USE.map((step, index) => (
                  <article key={step.title} className="rounded-[26px] border border-brand-teal/10 bg-white/80 p-5 shadow-soft dark:bg-brand-navy/35">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-teal text-sm font-bold text-white shadow-soft">
                        {index + 1}
                      </div>
                      <h3 className="font-serif text-lg font-bold text-brand-navy dark:text-brand-cream">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-7 text-gray-500 dark:text-gray-400">{step.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="modulos" className="px-4 py-12">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-brand-teal/10 bg-white/75 p-6 shadow-soft-xl dark:bg-brand-navy/35 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Modulos principales</p>
                <h2 className="mt-3 font-serif text-3xl font-bold text-brand-navy dark:text-brand-cream sm:text-4xl">
                  Todo lo necesario para participar, gestionar y comunicar.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                El proyecto combina modulos ciudadanos y administrativos para cubrir desde la publicacion inicial hasta el
                seguimiento, la respuesta y la explotacion de reportes.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Inicio y feed", "Publicaciones, comentarios, reposts y guardados."],
                ["Propuestas", "Ideas ciudadanas con apoyo y cambio de estado."],
                ["Denuncias", "Reportes de riesgos con evidencia y seguimiento."],
                ["Servicios", "Solicitudes publicas para necesidades del sector."],
                ["Foros", "Debates por comunidad y subtema."],
                ["Agenda", "Reuniones con asistencia confirmada."],
                ["Encuestas", "Votacion simple con resultados visibles."],
                ["Admin", "Usuarios, verificaciones, campanas y reportes."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-brand-teal/10 bg-brand-cream/85 p-4 dark:bg-brand-navy/45">
                  <p className="font-semibold text-brand-navy dark:text-brand-cream">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="beneficios" className="px-4 py-12">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="rounded-[30px] border border-brand-teal/10 bg-gradient-to-br from-brand-teal/15 via-white/80 to-brand-terracotta/10 p-6 shadow-soft dark:from-brand-teal/10 dark:via-brand-navy/45 dark:to-brand-terracotta/10">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Beneficios</p>
              <h2 className="mt-3 font-serif text-3xl font-bold text-brand-navy dark:text-brand-cream">
                Menos desorden, mas evidencia y mejor comunicacion comunitaria.
              </h2>
              <div className="mt-6 space-y-4">
                {[
                  "Reduce la perdida de informacion en canales improvisados.",
                  "Ordena la participacion con estados, comentarios y evidencias.",
                  "Segmenta avisos por zona y tema para evitar ruido.",
                  "Da a las instituciones datos exportables para priorizar decisiones.",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal text-[11px] text-white">
                      <i className="fas fa-check"></i>
                    </div>
                    <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {ROLE_CARDS.map((card) => (
                <article key={card.title} className="rounded-[26px] border border-brand-teal/10 bg-white/80 p-5 shadow-soft dark:bg-brand-navy/35">
                  <span className="inline-flex rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
                    {card.badge}
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-bold text-brand-navy dark:text-brand-cream">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-8">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-brand-teal/10 bg-brand-navy p-6 shadow-soft-xl dark:bg-[#121716] sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Listo para empezar</p>
                <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
                  Entra al portal y empieza a documentar, proponer y organizar tu comunidad.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                  Si quieres usar la plataforma como ciudadano o como responsable comunitario, el primer paso es crear tu
                  cuenta y confirmar tu correo. Desde ahi puedes configurar tu comunidad y comenzar a participar.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link to="/registro" className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white btn-primary">
                  <i className="fas fa-user-plus"></i>
                  Crear cuenta
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/15">
                  <i className="fas fa-right-to-bracket"></i>
                  Iniciar sesion
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
