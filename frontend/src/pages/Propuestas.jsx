import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { toggleDark } from "../App";
import NavMenu from "../components/NavMenu";
import AttachmentPreviewGrid from "../components/AttachmentPreviewGrid";
import MediaGallery from "../components/MediaGallery";
import { mergeAttachmentFiles, cleanupAttachmentItems, uploadEvidenceItems, uploadMediaItems } from "../utils/attachments";
import { isDocumentUrl, isVideoUrl, normalizeEvidenceFiles, normalizeMediaUrls } from "../utils/media";

// ── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = "Eliminar", danger = true }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden slide-in">
        <div className="p-6">
          <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center ${danger ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
            <i className={`fas fa-trash-alt text-2xl ${danger ? "text-red-500" : "text-amber-500"}`}></i>
          </div>
          <h3 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream text-center mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            {message}
          </p>
        </div>
        <div className="flex border-t border-brand-teal/10">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-semibold text-gray-500 hover:text-brand-navy dark:hover:text-brand-cream hover:bg-brand-teal/5 transition-colors"
          >
            Cancelar
          </button>
          <div className="w-px bg-brand-teal/10" />
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              danger
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            }`}
          >
            <i className="fas fa-trash-alt mr-1.5"></i>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Constantes ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "infraestructura", label: "Infraestructura", icon: "fa-road",         color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",   dot: "bg-orange-500" },
  { value: "seguridad",       label: "Seguridad",       icon: "fa-shield-alt",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",               dot: "bg-red-500" },
  { value: "ambiente",        label: "Medio Ambiente",  icon: "fa-leaf",         color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",       dot: "bg-green-500" },
  { value: "educacion",       label: "Educación",       icon: "fa-graduation-cap",color:"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",   dot: "bg-purple-500" },
  { value: "salud",           label: "Salud",           icon: "fa-heartbeat",    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",           dot: "bg-pink-500" },
  { value: "transporte",      label: "Transporte",      icon: "fa-bus",          color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",           dot: "bg-blue-500" },
  { value: "otro",            label: "Otro",            icon: "fa-ellipsis-h",   color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",              dot: "bg-gray-400" },
];

const STATUSES = [
  { value: "recibida",   label: "Recibida",    icon: "fa-inbox",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",   dot: "bg-amber-400" },
  { value: "en_gestion", label: "En gestión",  icon: "fa-cogs",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",       dot: "bg-blue-500" },
  { value: "resuelta",   label: "Resuelta",    icon: "fa-check-circle",color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",   dot: "bg-green-500" },
];

function getCat(value)    { return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[6]; }
function getStatus(value) { return STATUSES.find(s => s.value === value)   ?? STATUSES[0]; }

function fmtDate(iso) {
  if (!iso) return "";
  const d    = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)    return "Ahora";
  if (diff < 3600)  return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  return d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
      {s.label}
    </span>
  );
}

// ── ProposalCard ──────────────────────────────────────────────────────────────
function ProposalCard({ proposal, currentUserId, userRole, onDelete, onManage, onClick, onVote }) {
  const cat     = getCat(proposal.category);
  const profile = proposal.profile ?? {};
  const mediaUrls = normalizeMediaUrls(proposal);
  const primaryMediaUrl = mediaUrls[0] ?? null;
  const primaryIsVideo = isVideoUrl(primaryMediaUrl);
  const primaryIsDocument = isDocumentUrl(primaryMediaUrl);
  const isOwner = proposal.user_id === currentUserId;
  const canManage = ["diputado", "presidente_junta", "super_admin"].includes(userRole);
  const [voted,      setVoted]      = useState(proposal.user_voted ?? false);
  const [votesCount, setVotesCount] = useState(proposal.votes_count ?? 0);
  const [voting,     setVoting]     = useState(false);

  async function handleVote(e) {
    e.stopPropagation();
    if (voting) return;
    setVoting(true);
    try {
      const data = await onVote(proposal.id);
      setVoted(data.voted);
      setVotesCount(data.votes_count);
    } catch (_) {}
    setVoting(false);
  }

  return (
    <article
      onClick={() => onClick(proposal)}
      className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden hover:border-brand-teal/30 transition-all duration-200 cursor-pointer group"
    >
      <div className={`h-1 w-full ${cat.dot}`} />

      {/* Imagen/Video preview */}
      {primaryMediaUrl && !primaryIsVideo && !primaryIsDocument && (
        <div className="relative h-44 overflow-hidden">
          <img src={primaryMediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}
      {primaryMediaUrl && primaryIsVideo && (
        <div className="relative h-44 overflow-hidden bg-black flex items-center justify-center">
          <i className="fas fa-play-circle text-white text-4xl opacity-70"></i>
          <video src={primaryMediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        </div>
      )}
      {primaryMediaUrl && primaryIsDocument && (
        <div className="relative h-44 overflow-hidden bg-brand-cream dark:bg-brand-navy/30 flex flex-col items-center justify-center gap-3">
          <i className={`fas ${/\.pdf(\?|$)/i.test(primaryMediaUrl) ? "fa-file-pdf text-red-500" : "fa-file-word text-blue-500"} text-4xl`}></i>
          <span className="text-xs font-semibold text-brand-teal">Documento adjunto</span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.color}`}>
            <i className={`fas ${cat.icon} text-[10px]`}></i>
            {cat.label}
          </span>
          <StatusBadge status={proposal.status} />
        </div>

        {/* Título */}
        <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-snug line-clamp-2">
          {proposal.title}
        </h3>

        {/* Descripción */}
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {proposal.description}
        </p>

        {/* Ubicación */}
        {proposal.location_text && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <i className="fas fa-map-marker-alt text-brand-terracotta text-[10px]"></i>
            <span className="truncate">{proposal.location_text}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-brand-teal/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold">
              {profile.avatar_initials ?? "US"}
            </div>
            <div>
              <p className="text-xs font-medium text-brand-navy dark:text-brand-cream leading-none">
                {profile.full_name ?? "Usuario"}
              </p>
              <p className="text-[10px] text-gray-400">{fmtDate(proposal.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {/* Botón de voto */}
            <button
              onClick={handleVote}
              disabled={voting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
                voted
                  ? "bg-brand-terracotta/10 text-brand-terracotta border border-brand-terracotta/20"
                  : "bg-brand-cream dark:bg-brand-navy/30 text-gray-500 hover:text-brand-terracotta hover:bg-brand-terracotta/10 border border-brand-teal/20"
              }`}
            >
              {voting ? <i className="fas fa-spinner fa-spin text-[10px]"></i> : <i className={`${voted ? "fas" : "far"} fa-thumbs-up text-[10px]`}></i>}
              <span>{votesCount}</span>
            </button>
            {canManage && proposal.status !== "resuelta" && (
              <button
                onClick={() => onManage(proposal)}
                className="px-3 py-1.5 rounded-lg bg-brand-teal/10 hover:bg-brand-teal text-brand-teal hover:text-white text-xs font-semibold transition-all"
              >
                <i className="fas fa-cogs mr-1"></i>Gestionar
              </button>
            )}
            {isOwner && proposal.status === "recibida" && (
              <button
                onClick={() => onDelete(proposal.id)}
                className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all"
              >
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ── CreateProposalModal ───────────────────────────────────────────────────────
function CreateProposalModal({ onClose, onSubmit, loading, error, uploadFile }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "otro", location_text: "",
    latitude: null, longitude: null,
  });
  const [mediaItems, setMediaItems] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaNotice, setMediaNotice] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const mediaRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  function handleClose() {
    cleanupAttachmentItems(mediaItems);
    onClose();
  }
  function handleMediaSelect(e) {
    const files = Array.from(e.target.files ?? []);
    let skipped = 0;

    setMediaError("");
    setMediaNotice("");
    setMediaItems((prev) => {
      const next = mergeAttachmentFiles(prev, files, "media", 8);
      skipped = files.length - (next.length - prev.length);
      return next;
    });

    if (skipped > 0) {
      setMediaNotice("Algunos archivos no se agregaron. Revisa formato, tamano, duplicados o el limite de 8 archivos y 50MB por archivo.");
    }
    e.target.value = "";
  }

  function getLocation() {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { set("latitude", pos.coords.latitude); set("longitude", pos.coords.longitude); setLocLoading(false); },
      () => setLocLoading(false),
      { timeout: 10000 }
    );
  }

  async function handleSubmit() {
    let uploads = [];
    setMediaError("");
    setUploadStatus("");

    if (mediaItems.length > 0) {
      setUploadingMedia(true);
      try {
        uploads = await uploadMediaItems(mediaItems, uploadFile, ({ current, total, item }) => {
          setUploadStatus(`Subiendo ${current} de ${total}: ${item.name}`);
        });
      } catch (err) {
        setMediaError(err.message || "No se pudieron subir los archivos seleccionados.");
        setUploadingMedia(false);
        setUploadStatus("");
        return;
      }
      setUploadingMedia(false);
      setUploadStatus("");
    }

    onSubmit({
      ...form,
      image_url: uploads.find((item) => item.kind === "image")?.url ?? null,
      video_url: uploads.find((item) => item.kind === "video")?.url ?? null,
      media_files: uploads,
      media_urls: uploads.map((item) => item.url),
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="relative w-full max-w-lg bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-brand-teal/10 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <i className="fas fa-bullhorn text-white"></i>
            </div>
            <div>
              <h2 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Nueva Propuesta</h2>
              <p className="text-xs text-gray-400">Reporta un problema o sugiere una mejora</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Título */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Título *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Describe el problema o propuesta brevemente" maxLength={150}
              className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm transition-all" />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{form.title.length}/150</p>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-2">Categoría</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} onClick={() => set("category", cat.value)} type="button"
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm transition-all text-left ${form.category === cat.value ? cat.color + " border-current" : "border-brand-teal/15 hover:border-brand-teal/30"}`}>
                  <i className={`fas ${cat.icon} text-xs w-4 text-center`}></i>
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Descripción *</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4} maxLength={1000}
              placeholder="Describe detalladamente el problema, su ubicación y el impacto que tiene en la comunidad..."
              className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm transition-all resize-none" />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{form.description.length}/1000</p>
          </div>

          {/* Ubicación */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
              Ubicación <span className="text-gray-300 font-normal">(opcional)</span>
            </label>
            <div className="relative mb-2">
              <i className="fas fa-map-marker-alt absolute left-3.5 top-3 text-brand-terracotta/60 text-sm"></i>
              <input value={form.location_text} onChange={e => set("location_text", e.target.value)}
                placeholder="Ej: Calle El Conde, Zona Colonial, Santo Domingo"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm transition-all" />
            </div>
            <button onClick={getLocation} disabled={locLoading} type="button"
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-all ${
                form.latitude ? "border-green-400 bg-green-50 dark:bg-green-900/10 text-green-600" : "border-brand-teal/30 hover:border-brand-teal text-brand-teal"
              } disabled:opacity-50`}>
              {locLoading ? <><i className="fas fa-spinner fa-spin"></i> Obteniendo...</>
                : form.latitude ? <><i className="fas fa-check-circle text-green-500"></i> Ubicación GPS obtenida</>
                : <><i className="fas fa-crosshairs"></i> Usar mi ubicación GPS</>}
            </button>
          </div>

          {/* Media */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-2">
              Evidencia fotográfica o video <span className="text-gray-300 font-normal">(opcional)</span>
            </label>
            <button onClick={() => mediaRef.current?.click()} type="button"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-teal/30 text-sm font-medium transition-all text-gray-400 hover:text-brand-teal hover:border-brand-teal">
              <i className="fas fa-photo-film"></i> Subir varios archivos
            </button>
            <input ref={mediaRef} type="file" accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/quicktime,video/webm" multiple className="hidden" onChange={handleMediaSelect} />
            <p className="text-[11px] text-gray-400 mt-2">Puedes mezclar fotos, videos, PDF y Word en la misma propuesta. Maximo 8 archivos y 50MB por archivo.</p>
            {mediaItems.length > 0 && (
              <p className="mt-2 text-xs font-medium text-brand-teal">{mediaItems.length} archivo(s) listos para enviar.</p>
            )}
            {mediaNotice && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                {mediaNotice}
              </div>
            )}
            {uploadStatus && (
              <div className="mt-2 rounded-xl border border-brand-teal/20 bg-brand-teal/10 px-3 py-2 text-xs font-medium text-brand-teal">
                {uploadStatus}
              </div>
            )}
            <div className="mt-3">
              <AttachmentPreviewGrid
                items={mediaItems}
                onRemove={(id) => setMediaItems((prev) => {
                  const next = prev.filter((item) => item.id !== id);
                  const removed = prev.find((item) => item.id === id);
                  cleanupAttachmentItems(removed ? [removed] : []);
                  return next;
                })}
              />
            </div>
          </div>

          {mediaError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <i className="fas fa-exclamation-circle shrink-0"></i><span>{mediaError}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <i className="fas fa-exclamation-circle shrink-0"></i><span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-teal/10 shrink-0">
          <button onClick={handleSubmit} disabled={!form.title.trim() || !form.description.trim() || loading || uploadingMedia}
            className="w-full py-3 btn-warm text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
            {loading || uploadingMedia
              ? <><i className="fas fa-spinner fa-spin"></i> {uploadingMedia ? "Subiendo archivos..." : "Publicando..."}</>
              : <><i className="fas fa-paper-plane"></i> Publicar Propuesta</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ManageStatusModal ─────────────────────────────────────────────────────────
function ManageStatusModal({ proposal, onClose, onSubmit, loading, error, uploadEvidence }) {
  const [status,         setStatus]         = useState(proposal.status === "recibida" ? "en_gestion" : "resuelta");
  const [resolutionNote, setResolutionNote] = useState("");
  const [evidenceItems,  setEvidenceItems]  = useState([]);
  const [uploading,      setUploading]      = useState(false);
  const [evidenceError,  setEvidenceError]  = useState("");
  const [evidenceNotice, setEvidenceNotice] = useState("");
  const [uploadStatus,   setUploadStatus]   = useState("");
  const evidenceRef = useRef(null);

  function handleClose() {
    cleanupAttachmentItems(evidenceItems);
    onClose();
  }

  function handleEvidenceSelect(e) {
    const files = Array.from(e.target.files ?? []);
    let skipped = 0;

    setEvidenceError("");
    setEvidenceNotice("");
    setEvidenceItems((prev) => {
      const next = mergeAttachmentFiles(prev, files, "evidence", 10);
      skipped = files.length - (next.length - prev.length);
      return next;
    });

    if (skipped > 0) {
      setEvidenceNotice("Algunos archivos no se agregaron. Revisa formato, tamano, duplicados o el limite de 10 archivos y 50MB por archivo.");
    }
    e.target.value = "";
  }

  async function handleSubmit() {
    let evidenceUploads = [];
    setEvidenceError("");
    setUploadStatus("");
    if (evidenceItems.length > 0) {
      setUploading(true);
      try {
        evidenceUploads = await uploadEvidenceItems(evidenceItems, uploadEvidence, ({ current, total, item }) => {
          setUploadStatus(`Subiendo ${current} de ${total}: ${item.name}`);
        });
      } catch (err) {
        setEvidenceError(err.message || "No se pudieron subir las evidencias seleccionadas.");
        setUploading(false);
        setUploadStatus("");
        return;
      }
      setUploading(false);
      setUploadStatus("");
    }
    onSubmit(
      proposal.id,
      status,
      resolutionNote,
      evidenceUploads[0]?.url ?? null,
      evidenceUploads[0]?.path ?? null,
      evidenceUploads,
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="w-full max-w-md bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-brand-teal/10 flex items-center justify-between">
          <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Gestionar Propuesta</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-brand-cream dark:bg-brand-navy/30 p-3 rounded-xl line-clamp-2">
            <i className="fas fa-quote-left text-brand-teal mr-2 text-xs"></i>{proposal.title}
          </p>

          {/* Selector de estado */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-2">Nuevo estado</label>
            <div className="space-y-2">
              {STATUSES.filter(s => s.value !== "recibida").map(s => (
                <button key={s.value} onClick={() => setStatus(s.value)} type="button"
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${status === s.value ? s.color + " border-current" : "border-brand-teal/15 hover:border-brand-teal/30"}`}>
                  <i className={`fas ${s.icon} text-sm w-5 text-center`}></i>
                  <span className="font-semibold text-sm">{s.label}</span>
                  {status === s.value && <i className="fas fa-check-circle ml-auto text-sm"></i>}
                </button>
              ))}
            </div>
          </div>

          {/* Nota de resolución */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
              Nota {status === "resuelta" ? "*" : "(opcional)"}
            </label>
            <textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} rows={3}
              placeholder={status === "resuelta" ? "Describe cómo se resolvió el problema..." : "Describe las acciones que se están tomando..."}
              className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm resize-none transition-all" />
          </div>

          {/* Evidencia */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
              Evidencias {status === "resuelta" ? "* (requeridas)" : "(opcionales)"}
            </label>
            <div onClick={() => evidenceRef.current?.click()}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all border-brand-teal/30 hover:border-brand-teal text-gray-400">
              <i className="fas fa-folder-plus text-lg"></i>
              <div>
                <p className="text-sm font-medium">Subir varias fotos, PDF o videos</p>
                <p className="text-xs opacity-60">Máx 50MB</p>
              </div>
            </div>
            <input ref={evidenceRef} type="file" accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/quicktime,video/webm" multiple className="hidden" onChange={handleEvidenceSelect} />
            {evidenceItems.length > 0 && (
              <p className="mt-2 text-xs font-medium text-brand-teal">{evidenceItems.length} evidencia(s) listas para enviar.</p>
            )}
            {evidenceNotice && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                {evidenceNotice}
              </div>
            )}
            {uploadStatus && (
              <div className="mt-2 rounded-xl border border-brand-teal/20 bg-brand-teal/10 px-3 py-2 text-xs font-medium text-brand-teal">
                {uploadStatus}
              </div>
            )}
            <div className="mt-3">
              <AttachmentPreviewGrid
                items={evidenceItems}
                onRemove={(id) => setEvidenceItems((prev) => {
                  const next = prev.filter((item) => item.id !== id);
                  const removed = prev.find((item) => item.id === id);
                  cleanupAttachmentItems(removed ? [removed] : []);
                  return next;
                })}
              />
            </div>
          </div>

          {evidenceError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <i className="fas fa-exclamation-circle shrink-0"></i><span>{evidenceError}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <i className="fas fa-exclamation-circle shrink-0"></i><span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-teal/10 flex gap-3">
          <button onClick={handleClose} className="flex-1 py-3 rounded-xl border border-brand-teal/20 text-gray-400 hover:text-brand-navy text-sm font-semibold transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || uploading || (status === "resuelta" && evidenceItems.length === 0)}
            className="flex-1 py-3 btn-warm text-white font-semibold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
            {loading || uploading ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-check"></i> Confirmar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ProposalDetailModal ───────────────────────────────────────────────────────
function ProposalDetailModal({ proposal, onClose, currentUserId, onComment, onDeleteComment }) {
  const [comments,     setComments]     = useState([]);
  const [commentText,  setCommentText]  = useState("");
  const [commenting,   setCommenting]   = useState(false);
  const [commentError, setCommentError] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const { getProposalComments } = useAuth();
  const initials = useAuth().user?.avatar_initials ?? "TU";

  useEffect(() => {
    if (!proposal) return;
    setLoadingComments(true);
    getProposalComments(proposal.id)
      .then(data => setComments(data))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [proposal?.id]);

  async function handleComment() {
    if (!commentText.trim() || commenting) return;
    setCommenting(true);
    setCommentError("");
    try {
      const comment = await onComment(proposal.id, commentText.trim());
      setComments(prev => [...prev, comment]);
      setCommentText("");
    } catch (err) {
      setCommentError(err.message || "Error al comentar");
    }
    setCommenting(false);
  }

  if (!proposal) return null;
  const cat     = getCat(proposal.category);
  const profile = proposal.profile  ?? {};
  const manager = proposal.manager  ?? null;
  const mediaUrls = normalizeMediaUrls(proposal);
  const evidenceFiles = normalizeEvidenceFiles(proposal);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className={`${cat.dot} h-2 w-full shrink-0`} />

        <div className="overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.color}`}>
                    <i className={`fas ${cat.icon} text-[10px]`}></i>{cat.label}
                  </span>
                  <StatusBadge status={proposal.status} />
                </div>
                <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream leading-tight">
                  {proposal.title}
                </h2>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 shrink-0">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Imagen / Video */}
            <MediaGallery urls={mediaUrls} itemClassName="w-full max-h-60 rounded-xl bg-black object-cover" />

            {/* Descripción */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {proposal.description}
            </p>

            {/* Ubicación */}
            {proposal.location_text && (
              <div className="flex items-start gap-3 p-3 bg-brand-cream dark:bg-brand-navy/30 rounded-xl">
                <i className="fas fa-map-marker-alt text-brand-terracotta mt-0.5 shrink-0"></i>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Ubicación</p>
                  <p className="text-sm text-brand-navy dark:text-brand-cream">{proposal.location_text}</p>
                  {proposal.latitude && proposal.longitude && (
                    <a href={`https://maps.google.com/?q=${proposal.latitude},${proposal.longitude}`} target="_blank" rel="noreferrer"
                      className="text-xs text-brand-teal hover:underline mt-0.5 inline-flex items-center gap-1">
                      <i className="fas fa-external-link-alt text-[10px]"></i>Ver en Google Maps
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Votos */}
            <div className="flex items-center gap-3 p-3 bg-brand-cream dark:bg-brand-navy/30 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-brand-terracotta/10 flex items-center justify-center text-brand-terracotta shrink-0">
                <i className="fas fa-thumbs-up"></i>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Apoyos ciudadanos</p>
                <p className="text-sm font-bold text-brand-navy dark:text-brand-cream">
                  {proposal.votes_count ?? 0} {(proposal.votes_count ?? 0) === 1 ? "persona apoya" : "personas apoyan"} esta propuesta
                </p>
              </div>
            </div>

            {/* Autor */}
            <div className="flex items-center gap-3 p-3 bg-brand-cream dark:bg-brand-navy/30 rounded-xl">
              <div className="w-10 h-10 rounded-full avatar-teal flex items-center justify-center text-white font-bold text-sm shrink-0">
                {profile.avatar_initials ?? "US"}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Propuesta de</p>
                <p className="text-sm font-semibold text-brand-navy dark:text-brand-cream">{profile.full_name ?? "Usuario"}</p>
                <p className="text-xs text-gray-400">@{profile.username ?? "usuario"} · {fmtDate(proposal.created_at)}</p>
              </div>
            </div>

            {/* Gestión */}
            {proposal.status !== "recibida" && manager && (
              <div className={`p-4 rounded-xl border ${proposal.status === "resuelta" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${proposal.status === "resuelta" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
                  <i className={`fas ${proposal.status === "resuelta" ? "fa-check-circle" : "fa-cogs"} mr-1`}></i>
                  {proposal.status === "resuelta" ? "Propuesta resuelta" : "En gestión"}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold">
                    {manager.avatar_initials ?? "US"}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Gestionado por <strong>{manager.full_name}</strong> · {fmtDate(proposal.managed_at)}
                  </p>
                </div>
                {proposal.resolution_note && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{proposal.resolution_note}</p>
                )}
                {evidenceFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {evidenceFiles.map((file, index) => (
                      <a
                        key={`${file.url}-${index}`}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-brand-navy/50 border border-brand-teal/20 text-xs font-semibold text-brand-teal hover:bg-brand-teal hover:text-white transition-all"
                      >
                        <i className={`fas ${file.kind === "pdf" ? "fa-file-pdf" : file.kind === "video" ? "fa-video" : "fa-image"}`}></i>
                        {file.name || `Evidencia ${index + 1}`}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Comentarios ── */}
            <div className="border-t border-brand-teal/10 pt-4">
              <h4 className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3 flex items-center gap-2">
                <i className="fas fa-comments text-brand-teal"></i>
                Comentarios {comments.length > 0 && `(${comments.length})`}
              </h4>

              {loadingComments ? (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="h-12 rounded-xl animate-pulse bg-brand-cream dark:bg-brand-navy/30" />)}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">Sé el primero en comentar</p>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto scrollbar-hide mb-3">
                  {comments.map(c => {
                    const cp = c.profiles ?? {};
                    const isMyComment = c.user_id === currentUserId;
                    return (
                      <div key={c.id} className="flex gap-2 group">
                        <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {cp.avatar_initials ?? "US"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-brand-cream dark:bg-brand-navy/30 rounded-2xl px-3 py-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-semibold text-brand-navy dark:text-brand-cream">{cp.full_name ?? "Usuario"}</span>
                              <span className="text-[10px] text-gray-400">@{cp.username}</span>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-200 leading-snug">{c.content}</p>
                          </div>
                          {isMyComment && (
                            <button
                              onClick={() => onDeleteComment(proposal.id, c.id).then(() => setComments(prev => prev.filter(x => x.id !== c.id)))}
                              className="text-[10px] text-gray-400 hover:text-red-500 transition-colors ml-2 opacity-0 group-hover:opacity-100"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Input comentario */}
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold shrink-0">{initials}</div>
                <div className="flex-1">
                  <div className="flex gap-2">
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleComment()}
                      placeholder="Escribe un comentario..."
                      maxLength={300}
                      className="flex-1 px-3 py-2 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-xs transition-all"
                    />
                    <button
                      onClick={handleComment}
                      disabled={!commentText.trim() || commenting}
                      className="w-8 h-8 rounded-full btn-warm flex items-center justify-center text-white disabled:opacity-40 shrink-0"
                    >
                      {commenting ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-paper-plane text-xs"></i>}
                    </button>
                  </div>
                  {commentError && <p className="text-[10px] text-red-500 mt-1 px-1">{commentError}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Propuestas (main page) ────────────────────────────────────────────────────
export default function Propuestas() {
  const {
    user,
    getProposals, createProposal, deleteProposal, updateProposalStatus, uploadEvidence, toggleVote,
    createProposalComment, deleteProposalComment,
    uploadFile,
  } = useAuth();

  const [proposals,     setProposals]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [catFilter,     setCatFilter]     = useState("");
  const [createModal,   setCreateModal]   = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState("");
  const [manageModal,   setManageModal]   = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError,   setManageError]   = useState("");
  const [detailModal,   setDetailModal]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canManage = ["diputado", "presidente_junta", "super_admin"].includes(user?.role);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getProposals({ status: statusFilter || undefined, category: catFilter || undefined });
      setProposals(data);
    } catch (err) {
      setLoadError(err.message);
    }
    setLoading(false);
  }, [getProposals, statusFilter, catFilter]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  async function handleCreate(form) {
    setCreateLoading(true);
    setCreateError("");
    try {
      const proposal = await createProposal(form);
      setProposals(prev => [proposal, ...prev]);
      setCreateModal(false);
    } catch (err) {
      setCreateError(err.message);
    }
    setCreateLoading(false);
  }

  async function handleDelete(proposalId) {
    setConfirmDelete(proposalId);
  }

  async function confirmDeleteProposal() {
    try {
      await deleteProposal(confirmDelete);
      setProposals(prev => prev.filter(p => p.id !== confirmDelete));
    } catch (_) {}
    setConfirmDelete(null);
  }

  async function handleManage(proposalId, status, note, evidenceUrl, evidencePath, evidenceFiles) {
    setManageLoading(true);
    setManageError("");
    try {
      const updated = await updateProposalStatus(proposalId, status, note, evidenceUrl, evidencePath, evidenceFiles);
      setProposals(prev => prev.map(p => p.id === proposalId ? updated : p));
      setManageModal(null);
    } catch (err) {
      setManageError(err.message);
    }
    setManageLoading(false);
  }

  const counts = {
    all:        proposals.length,
    recibida:   proposals.filter(p => p.status === "recibida").length,
    en_gestion: proposals.filter(p => p.status === "en_gestion").length,
    resuelta:   proposals.filter(p => p.status === "resuelta").length,
  };

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20">
              <i className="fas fa-arrow-left text-sm"></i>
            </a>
            <div className="w-9 h-9 rounded-xl gradient-bg-warm flex items-center justify-center">
              <i className="fas fa-bullhorn text-white text-sm"></i>
            </div>
            <div>
              <h1 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-none">Propuestas Ciudadanas</h1>
              <p className="text-xs text-gray-400">{proposals.length} propuestas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchProposals} disabled={loading} className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20 disabled:opacity-40">
              <i className={`fas fa-sync-alt text-sm ${loading ? "fa-spin" : ""}`}></i>
            </button>
            {user?.email_verified !== false && (
              <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 px-4 py-2.5 btn-warm text-white font-semibold rounded-xl text-sm">
                <i className="fas fa-plus"></i>
                <span className="hidden sm:inline">Nueva Propuesta</span>
              </button>
            )}
            <NavMenu currentPath="/propuestas" />
          </div>
        </div>
      </header>

      <main className="pt-20 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* Filtros de estado */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex bg-brand-cream dark:bg-brand-navy/50 rounded-xl p-1 border border-brand-teal/10 gap-1 overflow-x-auto">
              {[
                { value: "",           label: "Todas",       count: counts.all },
                { value: "recibida",   label: "Recibidas",   count: counts.recibida },
                { value: "en_gestion", label: "En gestión",  count: counts.en_gestion },
                { value: "resuelta",   label: "Resueltas",   count: counts.resuelta },
              ].map(f => (
                <button key={f.value} onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === f.value ? "bg-white dark:bg-brand-navy shadow-sm text-brand-teal font-semibold" : "text-gray-500 hover:text-brand-navy dark:hover:text-brand-cream"
                  }`}>
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusFilter === f.value ? "bg-brand-teal/10 text-brand-teal" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="flex-1 sm:max-w-xs px-4 py-2.5 rounded-xl bg-brand-cream dark:bg-brand-navy/50 border border-brand-teal/10 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm text-gray-600 dark:text-gray-300">
              <option value="">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Error */}
          {loadError && (
            <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <i className="fas fa-exclamation-circle shrink-0"></i>
              <span>{loadError}</span>
              <button onClick={fetchProposals} className="ml-auto text-xs underline">Reintentar</button>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="card-soft rounded-2xl h-64 animate-pulse border border-brand-teal/10" />
              ))}
            </div>
          ) : proposals.length === 0 ? (
            <div className="card-soft rounded-2xl p-12 text-center border border-brand-teal/10">
              <i className="fas fa-bullhorn text-brand-teal/30 text-5xl mb-4"></i>
              <p className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream mb-1">
                No hay propuestas {statusFilter ? "con este estado" : ""}
              </p>
              <p className="text-sm text-gray-400 mb-5">Sé el primero en hacer una propuesta ciudadana.</p>
              <button onClick={() => setCreateModal(true)} className="inline-flex items-center gap-2 px-6 py-3 btn-warm text-white font-semibold rounded-xl text-sm">
                <i className="fas fa-plus"></i> Crear primera propuesta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proposals.map(p => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  currentUserId={user?.id}
                  userRole={user?.role}
                  onDelete={handleDelete}
                  onManage={proposal => { setManageModal(proposal); setManageError(""); }}
                  onClick={setDetailModal}
                  onVote={toggleVote}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modales */}
      {createModal && (
        <CreateProposalModal
          onClose={() => { setCreateModal(false); setCreateError(""); }}
          onSubmit={handleCreate}
          loading={createLoading}
          error={createError}
          uploadFile={uploadFile}
        />
      )}

      {manageModal && (
        <ManageStatusModal
          proposal={manageModal}
          onClose={() => setManageModal(null)}
          onSubmit={handleManage}
          loading={manageLoading}
          error={manageError}
          uploadEvidence={uploadEvidence}
        />
      )}

      <ProposalDetailModal
        proposal={detailModal}
        onClose={() => setDetailModal(null)}
        currentUserId={user?.id}
        onComment={createProposalComment}
        onDeleteComment={deleteProposalComment}
      />

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar propuesta"
          message="Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar esta propuesta?"
          confirmLabel="Sí, eliminar"
          onConfirm={confirmDeleteProposal}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
