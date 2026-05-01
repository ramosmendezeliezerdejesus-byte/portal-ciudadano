import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toggleDark } from "../App";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function isExpired(endsAt) {
  if (!endsAt) return false;
  return new Date() > new Date(endsAt);
}

const ROLE_BADGE = {
  super_admin: { label: "Admin", cls: "bg-gray-900 text-white dark:bg-white dark:text-gray-900" },
  diputado: { label: "Diputado", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  presidente_junta: { label: "Pdte. Junta", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  verified: { label: "Verificado", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
};

function PollCard({ poll, currentUserId, onVote, onDelete }) {
  const [busy, setBusy] = useState(false);
  const expired = isExpired(poll.ends_at);
  const hasVoted = !!poll.user_vote;
  const isOwner = poll.author?.id === currentUserId;
  const badge = ROLE_BADGE[poll.author?.role] ?? null;
  const hasOptions = (poll.options ?? []).length > 0;

  async function handleVote(optionId) {
    if (!hasOptions || hasVoted || expired || busy) return;
    setBusy(true);
    try {
      await onVote(poll.id, optionId);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("¿Eliminar esta encuesta?")) return;
    setBusy(true);
    try {
      await onDelete(poll.id);
    } finally {
      setBusy(false);
    }
  }

  const winnerVotes = Math.max(0, ...(poll.options ?? []).map(option => option.votes));

  return (
    <article className="card-soft rounded-2xl border border-brand-teal/10 p-5 shadow-soft space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/u/${poll.author?.username ?? ""}`}>
            <div className="w-11 h-11 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0">
              {poll.author?.avatar_initials ?? "US"}
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/u/${poll.author?.username ?? ""}`}
                className="font-semibold text-sm text-brand-navy dark:text-brand-cream truncate hover:underline"
              >
                {poll.author?.full_name ?? "Usuario"}
              </Link>
              {poll.author?.verified && (
                <i className="fas fa-circle-check text-brand-teal text-xs"></i>
              )}
              {badge && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
              <span>@{poll.author?.username ?? "usuario"}</span>
              <span>·</span>
              <span>{timeAgo(poll.created_at)}</span>
              {poll.ends_at && (
                <>
                  <span>·</span>
                  <span className={expired ? "text-red-500" : "text-amber-500"}>
                    {expired ? "Cerrada" : `Cierra ${new Date(poll.ends_at).toLocaleDateString("es-DO")}`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={busy}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
          >
            <i className={`fas ${busy ? "fa-spinner fa-spin" : "fa-trash"} text-xs`}></i>
          </button>
        )}
      </div>

      <div>
        <p className="font-semibold text-brand-navy dark:text-brand-cream text-base leading-snug">
          {poll.question}
        </p>
        {poll.description && (
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {poll.description}
          </p>
        )}
      </div>

      {!hasOptions ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300">
          Esta encuesta no tiene opciones disponibles para votar.
        </div>
      ) : (
        <div className="space-y-2">
          {poll.options.map((option) => {
            const isMine = poll.user_vote === option.id;
            const showResults = hasVoted || expired;
            const isWinner = showResults && option.votes === winnerVotes && winnerVotes > 0;

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={busy || hasVoted || expired}
                className={`w-full relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-all ${
                  hasVoted || expired
                    ? "cursor-default border-brand-teal/15"
                    : "hover:border-brand-teal hover:bg-brand-teal/5 border-brand-teal/20"
                } ${isMine ? "border-brand-teal bg-brand-teal/10" : "bg-white/70 dark:bg-white/5"}`}
              >
                {showResults && (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-xl ${
                      isMine ? "bg-brand-teal/20" : isWinner ? "bg-amber-400/15" : "bg-gray-100 dark:bg-white/5"
                    }`}
                    style={{ width: `${option.percent}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isMine ? "border-brand-teal bg-brand-teal" : "border-gray-300 dark:border-gray-600"
                    }`}>
                      {isMine && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <span className={`text-sm font-medium ${isMine ? "text-brand-teal" : "text-brand-navy dark:text-brand-cream"}`}>
                      {option.text}
                    </span>
                    {isWinner && <i className="fas fa-trophy text-amber-500 text-xs"></i>}
                  </div>

                  {showResults && (
                    <span className={`text-xs font-bold shrink-0 ${isMine ? "text-brand-teal" : "text-gray-500"}`}>
                      {option.percent}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="pt-2 border-t border-brand-teal/10 flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
        <span>
          {poll.total_votes === 0 ? "Sin votos aún" : `${poll.total_votes} voto${poll.total_votes === 1 ? "" : "s"}`}
        </span>
        {!hasVoted && !expired && hasOptions && <span className="text-brand-teal font-medium">Selecciona una opción</span>}
        {hasVoted && <span className="text-green-600 dark:text-green-400 font-medium">Votaste</span>}
        {expired && !hasVoted && <span className="text-red-500 font-medium">Encuesta cerrada</span>}
      </div>
    </article>
  );
}

function CreatePollModal({ onClose, onCreate }) {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateOption(index, value) {
    setOptions((current) => current.map((item, i) => (i === index ? value : item)));
  }

  function addOption() {
    if (options.length < 10) {
      setOptions((current) => [...current, ""]);
    }
  }

  function removeOption(index) {
    if (options.length <= 2) return;
    setOptions((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);

    setError("");
    if (!question.trim()) {
      setError("La pregunta es requerida.");
      return;
    }
    if (cleanOptions.length < 2) {
      setError("Debes agregar al menos 2 opciones.");
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        question: question.trim(),
        description: description.trim() || null,
        options: cleanOptions,
        ends_at: endsAt || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo crear la encuesta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full sm:max-w-xl bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl border border-brand-teal/20 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-brand-teal/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <i className="fas fa-poll text-white text-sm"></i>
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream">Nueva encuesta</h2>
              <p className="text-xs text-gray-400">Crea una votación para la comunidad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">
              Pregunta
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="¿Cuál es tu pregunta para la comunidad?"
              className="w-full px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">
              Descripción
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Contexto adicional opcional"
              className="w-full px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Opciones
              </label>
              <span className="text-xs text-gray-400">{options.length}/10</span>
            </div>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    maxLength={150}
                    placeholder={`Opción ${index + 1}`}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                onClick={addOption}
                className="mt-2 w-full py-2.5 rounded-xl border border-dashed border-brand-teal/30 text-brand-teal text-sm font-semibold hover:bg-brand-teal/5 transition-colors"
              >
                Agregar opción
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">
              Fecha de cierre
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-teal/10 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-brand-teal/20 text-gray-500 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl btn-primary text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Publicando...</> : <><i className="fas fa-paper-plane"></i> Publicar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Encuestas() {
  const { user, getPolls, createPoll, deletePoll, votePoll } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));

  useEffect(() => {
    loadPolls();
  }, []); // eslint-disable-line

  async function loadPolls() {
    setLoading(true);
    setError("");
    try {
      const data = await getPolls();
      setPolls(data);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las encuestas");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(form) {
    const createdPoll = await createPoll(form);
    setPolls((current) => [createdPoll, ...current.filter((poll) => poll.id !== createdPoll.id)]);
  }

  async function handleDelete(pollId) {
    await deletePoll(pollId);
    setPolls((current) => current.filter((poll) => poll.id !== pollId));
  }

  async function handleVote(pollId, optionId) {
    const result = await votePoll(pollId, optionId);
    const updatedPoll = result.poll;
    if (!updatedPoll) {
      await loadPolls();
      return;
    }
    setPolls((current) => current.map((poll) => (poll.id === pollId ? updatedPoll : poll)));
  }

  function handleToggleDark() {
    toggleDark();
    setDark((value) => !value);
  }

  return (
    <>
      {showCreate && (
        <CreatePollModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      <div className="min-h-screen bg-mesh">
        <nav className="sticky top-0 z-40 card-soft border-b border-brand-teal/10">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-brand-teal hover:bg-brand-teal/10 transition-colors"
              >
                <i className="fas fa-arrow-left text-sm"></i>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                  <i className="fas fa-poll text-white text-sm"></i>
                </div>
                <div>
                  <h1 className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream">Encuestas</h1>
                  <p className="text-[11px] text-gray-400">Votación ciudadana</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleDark}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-brand-teal/10 transition-colors"
              >
                <i className={`fas ${dark ? "fa-sun" : "fa-moon"} text-sm`}></i>
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2.5 btn-primary text-white rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <i className="fas fa-plus text-xs"></i>
                <span className="hidden sm:inline">Nueva encuesta</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <section className="rounded-2xl border border-brand-teal/15 bg-brand-teal/5 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-teal/10 flex items-center justify-center shrink-0">
              <i className="fas fa-info text-brand-teal text-sm"></i>
            </div>
            <div>
              <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream">
                Participación simple y transparente
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Cada usuario puede votar una sola vez por encuesta. Las opciones aparecen antes de votar y los resultados se muestran después del voto o cuando la encuesta cierra.
              </p>
            </div>
          </section>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="card-soft rounded-2xl border border-brand-teal/10 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((option) => (
                      <div key={option} className="h-11 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-5 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          ) : polls.length === 0 ? (
            <div className="card-soft rounded-2xl border border-brand-teal/10 p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-teal/10 flex items-center justify-center">
                <i className="fas fa-poll text-brand-teal text-2xl"></i>
              </div>
              <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">
                No hay encuestas todavía
              </h2>
              <p className="text-sm text-gray-500 mt-2 mb-6">
                Crea la primera encuesta para que la comunidad pueda participar.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="btn-primary text-white px-5 py-3 rounded-xl font-semibold text-sm"
              >
                Crear encuesta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  currentUserId={user?.id}
                  onVote={handleVote}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
