import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { toggleDark } from "../App";
import NavMenu from "../components/NavMenu";

// ── Utils ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-DO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function fmtTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function isUpcoming(dateStr) {
  return new Date(dateStr + "T23:59:59") >= new Date();
}

const CATEGORY_COLORS = {
  presupuesto: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  transporte:  { bg: "bg-blue-100 dark:bg-blue-900/30",       text: "text-blue-700 dark:text-blue-300",       dot: "bg-blue-500" },
  seguridad:   { bg: "bg-red-100 dark:bg-red-900/30",         text: "text-red-700 dark:text-red-300",         dot: "bg-red-500" },
  ambiente:    { bg: "bg-teal-100 dark:bg-teal-900/30",       text: "text-teal-700 dark:text-teal-300",       dot: "bg-teal-500" },
  educacion:   { bg: "bg-purple-100 dark:bg-purple-900/30",   text: "text-purple-700 dark:text-purple-300",   dot: "bg-purple-500" },
  general:     { bg: "bg-gray-100 dark:bg-gray-800",          text: "text-gray-600 dark:text-gray-300",       dot: "bg-gray-400" },
};

const CATEGORIES = [
  { value: "general",     label: "General" },
  { value: "presupuesto", label: "Presupuesto Participativo" },
  { value: "transporte",  label: "Transporte" },
  { value: "seguridad",   label: "Seguridad" },
  { value: "ambiente",    label: "Medio Ambiente" },
  { value: "educacion",   label: "Educación" },
];

// ── MeetingCard ────────────────────────────────────────────────────────────
function MeetingCard({ meeting, currentUserId, onRSVP, onDelete, onViewDetail }) {
  const cat           = CATEGORY_COLORS[meeting.category] ?? CATEGORY_COLORS.general;
  const catObj        = CATEGORIES.find(c => c.value === meeting.category);
  const isOwner       = meeting.user_id === currentUserId;
  const upcoming      = isUpcoming(meeting.date);
  const attending     = meeting.rsvp_users?.some(r => r.user_id === currentUserId);
  const attendeeCount = meeting.rsvp_count ?? meeting.rsvp_users?.length ?? 0;

  return (
    <article className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden hover:border-brand-teal/30 transition-all duration-200 group">
      <div className={`h-1 w-full ${cat.dot}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.bg} ${cat.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`}></span>
                {catObj?.label ?? meeting.category}
              </span>
              {!upcoming && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-400">
                  <i className="fas fa-history text-[9px]"></i> Pasada
                </span>
              )}
              {upcoming && attendeeCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-terracotta/10 text-brand-terracotta">
                  <i className="fas fa-users text-[9px]"></i> {attendeeCount} asistirán
                </span>
              )}
            </div>
            <h3
              className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-tight cursor-pointer hover:text-brand-teal transition-colors line-clamp-2"
              onClick={() => onViewDetail(meeting)}
            >
              {meeting.title}
            </h3>
          </div>
          {isOwner && upcoming && (
            <button
              onClick={() => onDelete(meeting.id)}
              className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              title="Eliminar reunión"
            >
              <i className="fas fa-trash-alt text-sm"></i>
            </button>
          )}
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <i className="fas fa-calendar-alt text-brand-teal w-4 text-center text-xs"></i>
            <span className="capitalize">{fmtDate(meeting.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <i className="fas fa-clock text-brand-teal w-4 text-center text-xs"></i>
            <span>{fmtTime(meeting.time)}</span>
            {meeting.duration_minutes && (
              <span className="text-gray-400 text-xs">· {meeting.duration_minutes} min</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <i className="fas fa-map-marker-alt text-brand-terracotta w-4 text-center text-xs"></i>
            <span className="truncate">{meeting.location}</span>
          </div>
        </div>

        {meeting.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
            {meeting.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-brand-teal/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold">
              {meeting.profiles?.avatar_initials ?? "US"}
            </div>
            <span className="text-xs text-gray-400">{meeting.profiles?.username ?? "usuario"}</span>
          </div>
          {upcoming ? (
            <button
              onClick={() => onRSVP(meeting.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                attending
                  ? "bg-brand-teal text-white hover:bg-brand-teal/80"
                  : "border border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
              }`}
            >
              <i className={`fas ${attending ? "fa-check-circle" : "fa-plus-circle"} text-xs`}></i>
              {attending ? "Asistiré" : "Confirmar"}
            </button>
          ) : (
            <span className="text-xs text-gray-400 italic">Reunión pasada</span>
          )}
        </div>
      </div>
    </article>
  );
}

// ── MeetingDetailModal ─────────────────────────────────────────────────────
function MeetingDetailModal({ meeting, currentUserId, onClose, onRSVP }) {
  if (!meeting) return null;
  const cat       = CATEGORY_COLORS[meeting.category] ?? CATEGORY_COLORS.general;
  const catObj    = CATEGORIES.find(c => c.value === meeting.category);
  const upcoming  = isUpcoming(meeting.date);
  const attending = meeting.rsvp_users?.some(r => r.user_id === currentUserId);
  const attendees = meeting.rsvp_users ?? [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className={`${cat.dot} h-2 w-full shrink-0`} />
        <div className="overflow-y-auto">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${cat.bg} ${cat.text}`}>
                  <span className={`w-2 h-2 rounded-full ${cat.dot}`}></span>
                  {catObj?.label}
                </span>
                <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream leading-tight">
                  {meeting.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors shrink-0"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-5 p-4 bg-brand-cream/50 dark:bg-white/5 rounded-xl">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                  <i className="fas fa-calendar-alt"></i>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Fecha</p>
                  <p className="font-semibold text-brand-navy dark:text-brand-cream capitalize">{fmtDate(meeting.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                  <i className="fas fa-clock"></i>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Hora</p>
                  <p className="font-semibold text-brand-navy dark:text-brand-cream">
                    {fmtTime(meeting.time)}
                    {meeting.duration_minutes && (
                      <span className="text-gray-400 font-normal"> · {meeting.duration_minutes} min</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-brand-terracotta/10 flex items-center justify-center text-brand-terracotta">
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Lugar</p>
                  <p className="font-semibold text-brand-navy dark:text-brand-cream">{meeting.location}</p>
                </div>
              </div>
            </div>

            {meeting.description && (
              <div className="mb-5">
                <h4 className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Descripción</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {meeting.description}
                </p>
              </div>
            )}

            {meeting.agenda && (
              <div className="mb-5">
                <h4 className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Agenda del día</h4>
                <div className="space-y-1">
                  {meeting.agenda.split("\n").filter(Boolean).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {attendees.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3 flex items-center gap-2">
                  <i className="fas fa-users text-brand-teal"></i>
                  {attendees.length} {attendees.length === 1 ? "persona confirmada" : "personas confirmadas"}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {attendees.slice(0, 12).map((r, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold"
                      title={r.profiles?.username ?? "usuario"}
                    >
                      {r.profiles?.avatar_initials ?? "US"}
                    </div>
                  ))}
                  {attendees.length > 12 && (
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-bold">
                      +{attendees.length - 12}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {upcoming && (
          <div className="p-4 border-t border-brand-teal/10 shrink-0 bg-white dark:bg-brand-navy">
            <button
              onClick={() => { onRSVP(meeting.id); onClose(); }}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                attending
                  ? "bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-red-50 hover:text-red-500"
                  : "btn-warm text-white"
              }`}
            >
              <i className={`fas ${attending ? "fa-times-circle" : "fa-check-circle"}`}></i>
              {attending ? "Cancelar asistencia" : "Confirmar asistencia"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CreateMeetingModal ─────────────────────────────────────────────────────
function CreateMeetingModal({ onClose, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    title: "", description: "", date: "", time: "",
    location: "", category: "general", duration_minutes: 60, agenda: "",
  });
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-brand-teal/10 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <i className="fas fa-calendar-plus text-white"></i>
            </div>
            <div>
              <h2 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Nueva Reunión</h2>
              <p className="text-xs text-gray-400">Convoca a la comunidad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Título *</label>
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Ej: Asamblea barrial sobre alumbrado público"
              maxLength={150}
              className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Categoría</label>
            <select
              value={form.category}
              onChange={e => set("category", e.target.value)}
              className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Fecha *</label>
              <input
                type="date"
                min={today}
                value={form.date}
                onChange={e => set("date", e.target.value)}
                className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Hora *</label>
              <input
                type="time"
                value={form.time}
                onChange={e => set("time", e.target.value)}
                className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Lugar *</label>
              <input
                value={form.location}
                onChange={e => set("location", e.target.value)}
                placeholder="Ej: Casa comunal Sector 4"
                maxLength={200}
                className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Duración (min)</label>
              <input
                type="number"
                min={15}
                max={480}
                step={15}
                value={form.duration_minutes}
                onChange={e => set("duration_minutes", parseInt(e.target.value))}
                className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="¿De qué trata esta reunión?"
              rows={3}
              maxLength={600}
              className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 resize-none focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
              Agenda del día{" "}
              <span className="text-gray-300 normal-case font-normal">(un punto por línea)</span>
            </label>
            <textarea
              value={form.agenda}
              onChange={e => set("agenda", e.target.value)}
              placeholder={"Bienvenida y registro\nPresentación de propuestas\nVotación\nCierre"}
              rows={4}
              className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 resize-none focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <i className="fas fa-exclamation-circle shrink-0"></i>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-teal/10 shrink-0 bg-white dark:bg-brand-navy">
          <button
            onClick={() => onSubmit(form)}
            disabled={!form.title.trim() || !form.date || !form.time || !form.location.trim() || loading}
            className="w-full py-3 btn-warm text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Publicando...</>
              : <><i className="fas fa-calendar-check"></i> Publicar Reunión</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Agenda ─────────────────────────────────────────────────────────────────
export default function Agenda() {
  const { user, getMeetings, createMeeting, deleteMeeting, toggleRSVP } = useAuth();

  const [meetings,      setMeetings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState("");
  const [createModal,   setCreateModal]   = useState(false);
  const [detailMeeting, setDetailMeeting] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState("");
  const [filter,        setFilter]        = useState("upcoming");
  const [catFilter,     setCatFilter]     = useState("all");

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getMeetings();
      setMeetings(data ?? []);
    } catch (err) {
      setLoadError(err.message ?? "No se pudieron cargar las reuniones.");
    }
    setLoading(false);
  }, [getMeetings]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  async function handleCreate(form) {
    setCreateLoading(true);
    setCreateError("");
    try {
      const meeting = await createMeeting(form);
      setMeetings(prev =>
        [...prev, meeting].sort(
          (a, b) =>
            new Date(a.date + "T" + (a.time ?? "00:00")) -
            new Date(b.date + "T" + (b.time ?? "00:00"))
        )
      );
      setCreateModal(false);
    } catch (err) {
      setCreateError(err.message ?? "Error al crear la reunión");
    }
    setCreateLoading(false);
  }

  async function handleRSVP(meetingId) {
    try {
      const data = await toggleRSVP(meetingId);
      const updateList = list => list.map(meet => {
        if (meet.id !== meetingId) return meet;
        const rsvp_users = data.attending
          ? [...(meet.rsvp_users ?? []), {
              user_id:  user?.id,
              profiles: { avatar_initials: user?.avatar_initials ?? "TU" },
            }]
          : (meet.rsvp_users ?? []).filter(r => r.user_id !== user?.id);
        return { ...meet, rsvp_users, rsvp_count: data.count };
      });
      setMeetings(updateList);
      if (detailMeeting?.id === meetingId) {
        setDetailMeeting(prev => {
          if (!prev) return prev;
          const rsvp_users = data.attending
            ? [...(prev.rsvp_users ?? []), {
                user_id:  user?.id,
                profiles: { avatar_initials: user?.avatar_initials ?? "TU" },
              }]
            : (prev.rsvp_users ?? []).filter(r => r.user_id !== user?.id);
          return { ...prev, rsvp_users, rsvp_count: data.count };
        });
      }
    } catch (err) {
      console.error("Error RSVP:", err.message);
    }
  }

  async function handleDelete(meetingId) {
    if (!window.confirm("¿Eliminar esta reunión?")) return;
    try {
      await deleteMeeting(meetingId);
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
    } catch (err) {
      console.error("Error al eliminar:", err.message);
    }
  }

  const filtered = meetings.filter(m => {
    const up = isUpcoming(m.date);
    if (filter === "upcoming" && !up) return false;
    if (filter === "past"     &&  up) return false;
    if (catFilter !== "all" && m.category !== catFilter) return false;
    return true;
  });

  const upcomingCount = meetings.filter(m => isUpcoming(m.date)).length;
  const initials = user?.avatar_initials ?? user?.full_name?.slice(0, 2).toUpperCase() ?? "TU";

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20"
              title="Volver"
            >
              <i className="fas fa-arrow-left text-sm"></i>
            </a>
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
              <i className="fas fa-calendar-alt text-white text-sm"></i>
            </div>
            <div>
              <h1 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-none">
                Agenda Comunitaria
              </h1>
              <p className="text-xs text-gray-400">{upcomingCount} próximas reuniones</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMeetings}
              disabled={loading}
              className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20 disabled:opacity-40"
              title="Actualizar"
            >
              <i className={`fas fa-sync-alt text-sm ${loading ? "fa-spin" : ""}`}></i>
            </button>
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 btn-warm text-white font-semibold rounded-xl text-sm"
            >
              <i className="fas fa-plus"></i>
              <span className="hidden sm:inline">Nueva Reunión</span>
            </button>
            <NavMenu currentPath="/agenda" />
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="pt-20 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-6">

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex bg-brand-cream dark:bg-brand-navy/50 rounded-xl p-1 border border-brand-teal/10 gap-1">
              {[["upcoming", "Próximas"], ["past", "Pasadas"], ["all", "Todas"]].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === v
                      ? "bg-white dark:bg-brand-navy shadow-sm text-brand-teal font-semibold"
                      : "text-gray-500 hover:text-brand-navy dark:hover:text-brand-cream"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="flex-1 sm:max-w-xs px-4 py-2.5 rounded-xl bg-brand-cream dark:bg-brand-navy/50 border border-brand-teal/10 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm text-gray-600 dark:text-gray-300"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {loadError && !loading && (
            <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <i className="fas fa-exclamation-circle shrink-0"></i>
              <span>{loadError}</span>
              <button onClick={fetchMeetings} className="ml-auto text-xs underline">Reintentar</button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card-soft rounded-2xl h-52 animate-pulse border border-brand-teal/10" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card-soft rounded-2xl p-12 text-center border border-brand-teal/10">
              <i className="fas fa-calendar-times text-brand-teal/30 text-5xl mb-4"></i>
              <p className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream mb-1">
                {filter === "upcoming" ? "No hay reuniones próximas" : "No hay reuniones"}
              </p>
              <p className="text-sm text-gray-400 mb-5">
                {filter === "upcoming" ? "Sé el primero en convocar a la comunidad." : "Ajusta los filtros para ver más."}
              </p>
              {filter !== "past" && (
                <button
                  onClick={() => setCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 btn-warm text-white font-semibold rounded-xl text-sm"
                >
                  <i className="fas fa-plus"></i> Crear primera reunión
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  currentUserId={user?.id}
                  onRSVP={handleRSVP}
                  onDelete={handleDelete}
                  onViewDetail={setDetailMeeting}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {createModal && (
        <CreateMeetingModal
          onClose={() => { setCreateModal(false); setCreateError(""); }}
          onSubmit={handleCreate}
          loading={createLoading}
          error={createError}
        />
      )}

      <MeetingDetailModal
        meeting={detailMeeting}
        currentUserId={user?.id}
        onClose={() => setDetailMeeting(null)}
        onRSVP={handleRSVP}
      />
    </div>
  );
}