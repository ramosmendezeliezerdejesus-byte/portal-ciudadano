import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import NavMenu from "../components/NavMenu";

const THREAD_CATEGORIES = [
  { value: "general", label: "General", icon: "fa-comments", tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { value: "seguridad", label: "Delincuencia", icon: "fa-shield-alt", tone: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  { value: "servicios", label: "Servicios", icon: "fa-faucet", tone: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "limpieza", label: "Limpieza", icon: "fa-broom", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { value: "movilidad", label: "Movilidad", icon: "fa-road", tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
];

function fmtDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleDateString("es-DO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function categoryMeta(value) {
  return THREAD_CATEGORIES.find((item) => item.value === value) ?? THREAD_CATEGORIES[0];
}

function RoleBadge({ role, verified }) {
  if (role === "super_admin") {
    return <i className="fas fa-shield-alt text-slate-800 dark:text-white text-xs"></i>;
  }
  if (verified || role === "verified") {
    return <i className="fas fa-check-circle text-brand-teal text-xs"></i>;
  }
  if (role === "diputado") {
    return <i className="fas fa-star text-amber-500 text-xs"></i>;
  }
  if (role === "presidente_junta") {
    return <i className="fas fa-home text-emerald-500 text-xs"></i>;
  }
  return null;
}

function CreatorLine({ profile }) {
  if (!profile) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white font-bold">
        {profile.avatar_initials ?? "US"}
      </span>
      <span className="font-medium text-brand-navy dark:text-brand-cream">{profile.full_name}</span>
      <RoleBadge role={profile.role} verified={profile.verified} />
      <span>@{profile.username}</span>
    </div>
  );
}

export default function Foros() {
  const {
    user,
    getForums,
    createForum,
    getForumDetail,
    createForumThread,
    getForumThread,
    createForumMessage,
    updateMyCommunity,
  } = useAuth();

  const [forums, setForums] = useState([]);
  const [selectedForumId, setSelectedForumId] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [forumDetail, setForumDetail] = useState(null);
  const [threadDetail, setThreadDetail] = useState(null);
  const [community, setCommunity] = useState(user?.community ?? "");
  const [addressReference, setAddressReference] = useState(user?.address_reference ?? "");
  const [canCreateMainForum, setCanCreateMainForum] = useState(false);
  const [loadingForums, setLoadingForums] = useState(true);
  const [loadingForumDetail, setLoadingForumDetail] = useState(false);
  const [loadingThreadDetail, setLoadingThreadDetail] = useState(false);
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forumForm, setForumForm] = useState({ title: "", description: "" });
  const [threadForm, setThreadForm] = useState({ title: "", category: "general", content: "" });
  const [messageText, setMessageText] = useState("");
  const [submittingForum, setSubmittingForum] = useState(false);
  const [submittingThread, setSubmittingThread] = useState(false);
  const [submittingMessage, setSubmittingMessage] = useState(false);

  async function loadForums(nextForumId = null) {
    setLoadingForums(true);
    setError("");
    try {
      const data = await getForums();
      const nextForums = data.forums ?? [];
      setForums(nextForums);
      setCanCreateMainForum(Boolean(data.can_create_main_forum));

      const desiredForumId = nextForumId ?? selectedForumId ?? nextForums[0]?.id ?? null;
      setSelectedForumId(desiredForumId);

      if (desiredForumId) {
        await loadForumDetail(desiredForumId);
      } else {
        setForumDetail(null);
        setSelectedThreadId(null);
        setThreadDetail(null);
      }
    } catch (err) {
      setError(err.message || "No se pudieron cargar los foros");
      setForumDetail(null);
      setThreadDetail(null);
    }
    setLoadingForums(false);
  }

  async function loadForumDetail(forumId, nextThreadId = null) {
    if (!forumId) return;
    setLoadingForumDetail(true);
    try {
      const data = await getForumDetail(forumId);
      setForumDetail(data);
      const desiredThreadId = nextThreadId ?? selectedThreadId ?? data.threads?.[0]?.id ?? null;
      setSelectedForumId(forumId);
      setSelectedThreadId(desiredThreadId);
      if (desiredThreadId) {
        await loadThreadDetail(desiredThreadId);
      } else {
        setThreadDetail(null);
      }
    } catch (err) {
      setError(err.message || "No se pudo abrir el foro");
    }
    setLoadingForumDetail(false);
  }

  async function loadThreadDetail(threadId) {
    if (!threadId) return;
    setLoadingThreadDetail(true);
    try {
      const data = await getForumThread(threadId);
      setThreadDetail(data);
      setSelectedThreadId(threadId);
    } catch (err) {
      setError(err.message || "No se pudo abrir el subforo");
    }
    setLoadingThreadDetail(false);
  }

  useEffect(() => {
    if (user?.community) {
      loadForums();
    } else {
      setLoadingForums(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.community]);

  async function handleSaveCommunity() {
    if (!community.trim()) {
      setError("Escribe tu comunidad principal para usar los foros");
      return;
    }
    setSavingCommunity(true);
    setError("");
    setSuccess("");
    try {
      await updateMyCommunity(community, addressReference);
      setSuccess("Tu comunidad fue guardada. Ya puedes entrar a los foros de tu zona.");
      await loadForums();
    } catch (err) {
      setError(err.message || "No se pudo guardar la comunidad");
    }
    setSavingCommunity(false);
  }

  async function handleCreateForum(e) {
    e.preventDefault();
    if (!forumForm.title.trim()) {
      setError("Ponle un nombre al foro principal");
      return;
    }
    setSubmittingForum(true);
    setError("");
    try {
      const forum = await createForum(forumForm);
      setForumForm({ title: "", description: "" });
      setSuccess("Foro principal creado");
      await loadForums(forum.id);
    } catch (err) {
      setError(err.message || "No se pudo crear el foro");
    }
    setSubmittingForum(false);
  }

  async function handleCreateThread(e) {
    e.preventDefault();
    if (!selectedForumId) {
      setError("Selecciona primero un foro principal");
      return;
    }
    setSubmittingThread(true);
    setError("");
    try {
      const thread = await createForumThread(selectedForumId, threadForm);
      setThreadForm({ title: "", category: "general", content: "" });
      setSuccess("Subforo creado");
      await loadForumDetail(selectedForumId, thread.id);
    } catch (err) {
      setError(err.message || "No se pudo crear el subforo");
    }
    setSubmittingThread(false);
  }

  async function handleCreateMessage(e) {
    e.preventDefault();
    if (!selectedThreadId) {
      setError("Selecciona un subforo para responder");
      return;
    }
    if (!messageText.trim()) return;
    setSubmittingMessage(true);
    setError("");
    try {
      await createForumMessage(selectedThreadId, messageText);
      setMessageText("");
      await loadThreadDetail(selectedThreadId);
    } catch (err) {
      setError(err.message || "No se pudo publicar el mensaje");
    }
    setSubmittingMessage(false);
  }

  const selectedForum = forumDetail?.forum;
  const threads = forumDetail?.threads ?? [];
  const selectedThread = threadDetail?.thread;
  const messages = threadDetail?.messages ?? [];

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100">
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="w-9 h-9 rounded-xl bg-brand-cream dark:bg-brand-navy/50 flex items-center justify-center hover:bg-brand-teal/10 transition-colors border border-brand-teal/20 text-brand-navy dark:text-brand-cream"
              title="Volver"
            >
              <i className="fas fa-arrow-left text-sm"></i>
            </a>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-brand-teal">Comunidad</p>
              <h1 className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream">Foros vecinales</h1>
            </div>
          </div>
          <NavMenu currentPath="/foros" />
        </div>
      </header>

      <main className="pt-24 pb-10 px-4">
        <div className="max-w-7xl mx-auto space-y-5">
          <section className="card-soft rounded-3xl p-6 border border-brand-teal/10 shadow-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-teal mb-2">Acceso por comunidad</p>
                <h2 className="font-serif font-bold text-2xl text-brand-navy dark:text-brand-cream">
                  {user?.community ? `Foros de ${user.community}` : "Activa tu comunidad"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-3xl">
                  Los foros principales los crean diputados o presidentes de junta. Dentro de cada foro, los vecinos de la misma comunidad pueden abrir subforos como delincuencia, basura, agua o cualquier tema local.
                </p>
              </div>
              {user?.community && (
                <div className="rounded-2xl bg-brand-teal/10 border border-brand-teal/20 px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Referencia actual</p>
                  <p className="font-semibold text-brand-navy dark:text-brand-cream">{user.community}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.address_reference || "Sin referencia detallada"}</p>
                </div>
              )}
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
              {success}
            </div>
          )}

          {!user?.community ? (
            <section className="card-soft rounded-3xl p-6 border border-brand-teal/10 shadow-soft max-w-2xl">
              <h3 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream mb-2">
                Define tu comunidad principal
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Para saber si perteneces a Los Mina, Villa Mella o cualquier otra zona, el sistema usa este campo principal de comunidad. La calle o barrio queda como referencia adicional.
              </p>
              <div className="space-y-3">
                <input
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  placeholder="Ej: Los Mina"
                  className="w-full px-4 py-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none"
                />
                <input
                  value={addressReference}
                  onChange={(e) => setAddressReference(e.target.value)}
                  placeholder="Ej: Calle Duarte, sector Vietnam"
                  className="w-full px-4 py-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none"
                />
                <button
                  onClick={handleSaveCommunity}
                  disabled={savingCommunity}
                  className="px-5 py-3 btn-warm text-white font-semibold rounded-2xl disabled:opacity-60"
                >
                  {savingCommunity ? "Guardando..." : "Guardar comunidad"}
                </button>
              </div>
            </section>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
              <aside className="space-y-5">
                <section className="card-soft rounded-3xl p-5 border border-brand-teal/10 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-brand-teal">Foros principales</p>
                      <h3 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">{user.community}</h3>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal">
                      {forums.length} activos
                    </span>
                  </div>

                  <div className="space-y-3">
                    {loadingForums ? (
                      <p className="text-sm text-gray-500">Cargando foros...</p>
                    ) : forums.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-brand-teal/20 p-4 text-sm text-gray-500">
                        Todavia no existe un foro principal para esta comunidad.
                      </div>
                    ) : (
                      forums.map((forum) => (
                        <button
                          key={forum.id}
                          onClick={() => loadForumDetail(forum.id)}
                          className={`w-full text-left rounded-2xl border p-4 transition-all ${
                            selectedForumId === forum.id
                              ? "border-brand-teal bg-brand-teal/10"
                              : "border-brand-teal/10 hover:border-brand-teal/30 hover:bg-brand-teal/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-brand-navy dark:text-brand-cream">{forum.title}</p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{forum.description || "Foro principal de la comunidad."}</p>
                            </div>
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/80 dark:bg-brand-navy/40 text-brand-teal">
                              {forum.threads_count} temas
                            </span>
                          </div>
                          <div className="mt-3">
                            <CreatorLine profile={forum.creator} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </section>

                {canCreateMainForum && (
                  <section className="card-soft rounded-3xl p-5 border border-brand-teal/10 shadow-soft">
                    <p className="text-xs uppercase tracking-[0.22em] text-brand-teal mb-2">Nuevo foro principal</p>
                    <form className="space-y-3" onSubmit={handleCreateForum}>
                      <input
                        value={forumForm.title}
                        onChange={(e) => setForumForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Ej: Foro oficial de Los Mina"
                        className="w-full px-4 py-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none"
                      />
                      <textarea
                        value={forumForm.description}
                        onChange={(e) => setForumForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe el objetivo del foro principal"
                        className="w-full px-4 py-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none min-h-[110px]"
                      />
                      <button
                        type="submit"
                        disabled={submittingForum}
                        className="w-full py-3 rounded-2xl btn-warm text-white font-semibold disabled:opacity-60"
                      >
                        {submittingForum ? "Creando..." : "Crear foro principal"}
                      </button>
                    </form>
                  </section>
                )}
              </aside>

              <section className="space-y-5">
                {selectedForum ? (
                  <>
                    <section className="card-soft rounded-3xl p-6 border border-brand-teal/10 shadow-soft">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-brand-teal mb-2">Foro principal</p>
                          <h3 className="font-serif font-bold text-2xl text-brand-navy dark:text-brand-cream">
                            {selectedForum.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-3xl">
                            {selectedForum.description || "Espacio principal para conversar los asuntos de la comunidad."}
                          </p>
                          <div className="mt-3">
                            <CreatorLine profile={selectedForum.creator} />
                          </div>
                        </div>
                        <div className="rounded-2xl bg-brand-terracotta/10 border border-brand-terracotta/20 px-4 py-3">
                          <p className="text-xs text-gray-500">Comunidad visible</p>
                          <p className="font-semibold text-brand-navy dark:text-brand-cream">{selectedForum.community}</p>
                        </div>
                      </div>
                    </section>

                    <section className="card-soft rounded-3xl p-6 border border-brand-teal/10 shadow-soft">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-brand-teal mb-2">Subforos y temas</p>
                          <h4 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">
                            Conversaciones de {selectedForum.community}
                          </h4>
                        </div>
                        <span className="text-sm text-gray-500">{threads.length} temas abiertos</span>
                      </div>

                      <form className="mt-5 grid grid-cols-1 gap-3" onSubmit={handleCreateThread}>
                        <input
                          value={threadForm.title}
                          onChange={(e) => setThreadForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Ej: Delincuencia en Los Mina norte"
                          className="w-full px-4 py-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-3">
                          <select
                            value={threadForm.category}
                            onChange={(e) => setThreadForm((prev) => ({ ...prev, category: e.target.value }))}
                            className="w-full px-4 py-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none"
                          >
                            {THREAD_CATEGORIES.map((category) => (
                              <option key={category.value} value={category.value}>{category.label}</option>
                            ))}
                          </select>
                          <textarea
                            value={threadForm.content}
                            onChange={(e) => setThreadForm((prev) => ({ ...prev, content: e.target.value }))}
                            placeholder="Explica el problema o tema que quieres discutir con la comunidad"
                            className="w-full px-4 py-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none min-h-[110px]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={submittingThread}
                          className="justify-self-start px-5 py-3 rounded-2xl btn-warm text-white font-semibold disabled:opacity-60"
                        >
                          {submittingThread ? "Publicando..." : "Crear subforo"}
                        </button>
                      </form>

                      <div className="mt-6 space-y-3">
                        {loadingForumDetail ? (
                          <p className="text-sm text-gray-500">Cargando temas...</p>
                        ) : threads.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-brand-teal/20 p-4 text-sm text-gray-500">
                            Aun no hay subforos. Puedes abrir el primero.
                          </div>
                        ) : (
                          threads.map((thread) => {
                            const meta = categoryMeta(thread.category);
                            return (
                              <button
                                key={thread.id}
                                onClick={() => loadThreadDetail(thread.id)}
                                className={`w-full text-left rounded-2xl border p-4 transition-all ${
                                  selectedThreadId === thread.id
                                    ? "border-brand-terracotta bg-brand-terracotta/5"
                                    : "border-brand-teal/10 hover:border-brand-teal/30 hover:bg-brand-teal/5"
                                }`}
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.tone}`}>
                                        <i className={`fas ${meta.icon} text-[10px]`}></i>
                                        {meta.label}
                                      </span>
                                      {thread.is_pinned && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-teal/10 text-brand-teal">
                                          <i className="fas fa-thumbtack text-[10px]"></i>
                                          Destacado
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-semibold text-brand-navy dark:text-brand-cream mt-2">{thread.title}</p>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{thread.content}</p>
                                  </div>
                                  <div className="text-right text-xs text-gray-500 shrink-0">
                                    <p>{thread.messages_count} respuestas</p>
                                    <p className="mt-1">{fmtDate(thread.created_at)}</p>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <CreatorLine profile={thread.creator} />
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </section>

                    <section className="card-soft rounded-3xl p-6 border border-brand-teal/10 shadow-soft">
                      {selectedThread ? (
                        <>
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${categoryMeta(selectedThread.category).tone}`}>
                              <i className={`fas ${categoryMeta(selectedThread.category).icon} text-[10px]`}></i>
                              {categoryMeta(selectedThread.category).label}
                            </span>
                            <span className="text-xs text-gray-500">{fmtDate(selectedThread.created_at)}</span>
                          </div>
                          <h4 className="font-serif font-bold text-2xl text-brand-navy dark:text-brand-cream">
                            {selectedThread.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-line">
                            {selectedThread.content}
                          </p>
                          <div className="mt-4">
                            <CreatorLine profile={selectedThread.creator} />
                          </div>

                          <div className="mt-6 pt-6 border-t border-brand-teal/10 space-y-4">
                            <h5 className="font-semibold text-brand-navy dark:text-brand-cream">
                              Respuestas de la comunidad
                            </h5>
                            {loadingThreadDetail ? (
                              <p className="text-sm text-gray-500">Cargando mensajes...</p>
                            ) : messages.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-brand-teal/20 p-4 text-sm text-gray-500">
                                Todavia no hay respuestas. Abre la conversacion con el primer comentario.
                              </div>
                            ) : (
                              messages.map((message) => (
                                <article key={message.id} className="rounded-2xl border border-brand-teal/10 p-4 bg-white/70 dark:bg-brand-navy/20">
                                  <CreatorLine profile={message.profile} />
                                  <p className="text-xs text-gray-400 mt-2">{fmtDate(message.created_at)}</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-3 whitespace-pre-line">
                                    {message.content}
                                  </p>
                                </article>
                              ))
                            )}

                            <form onSubmit={handleCreateMessage} className="space-y-3">
                              <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Escribe tu respuesta para este subforo"
                                className="w-full px-4 py-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none min-h-[120px]"
                              />
                              <button
                                type="submit"
                                disabled={submittingMessage || !messageText.trim()}
                                className="px-5 py-3 rounded-2xl btn-warm text-white font-semibold disabled:opacity-60"
                              >
                                {submittingMessage ? "Enviando..." : "Responder en el subforo"}
                              </button>
                            </form>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-brand-teal/20 p-6 text-sm text-gray-500">
                          Selecciona un subforo para ver la conversacion completa.
                        </div>
                      )}
                    </section>
                  </>
                ) : (
                  <section className="card-soft rounded-3xl p-6 border border-brand-teal/10 shadow-soft">
                    <div className="rounded-2xl border border-dashed border-brand-teal/20 p-6 text-sm text-gray-500">
                      Cuando exista un foro principal en tu comunidad, aparecera aqui para que los vecinos puedan abrir temas y conversar.
                    </div>
                  </section>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
