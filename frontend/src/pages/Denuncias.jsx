import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import NavMenu from "../components/NavMenu";
import AttachmentPreviewGrid from "../components/AttachmentPreviewGrid";
import MediaGallery from "../components/MediaGallery";
import { mergeAttachmentFiles, cleanupAttachmentItems, uploadEvidenceItems, uploadMediaItems } from "../utils/attachments";
import { isDocumentUrl, isVideoUrl, normalizeEvidenceFiles, normalizeMediaUrls } from "../utils/media";

const CATEGORIES = [
  { value: "infraestructura", label: "Infraestructura", icon: "fa-road", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", dot: "bg-orange-500" },
  { value: "seguridad", label: "Seguridad", icon: "fa-shield-alt", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
  { value: "ambiente", label: "Medio Ambiente", icon: "fa-leaf", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", dot: "bg-green-500" },
  { value: "educacion", label: "Educacion", icon: "fa-graduation-cap", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", dot: "bg-purple-500" },
  { value: "salud", label: "Salud", icon: "fa-heartbeat", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400", dot: "bg-pink-500" },
  { value: "transporte", label: "Transporte", icon: "fa-bus", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
  { value: "otro", label: "Otro", icon: "fa-ellipsis-h", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", dot: "bg-gray-400" },
];

const STATUSES = [
  { value: "recibida", label: "Recibida", icon: "fa-inbox", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-400" },
  { value: "en_gestion", label: "En gestion", icon: "fa-cogs", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
  { value: "resuelta", label: "Resuelta", icon: "fa-check-circle", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", dot: "bg-green-500" },
];

function getCat(value) {
  return CATEGORIES.find((item) => item.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

function getStatus(value) {
  return STATUSES.find((item) => item.value === value) ?? STATUSES[0];
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "Ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }) {
  const meta = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
      {meta.label}
    </span>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <i className="fas fa-trash-alt text-red-500 text-2xl"></i>
          </div>
          <h3 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream mb-2">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-brand-teal/10">
          <button onClick={onCancel} className="flex-1 py-4 text-sm font-semibold text-gray-500 hover:bg-brand-teal/5">Cancelar</button>
          <div className="w-px bg-brand-teal/10" />
          <button onClick={onConfirm} className="flex-1 py-4 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Si, eliminar</button>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ report, currentUserId, userRole, onDelete, onManage, onOpen, onVote }) {
  const cat = getCat(report.category);
  const profile = report.profile ?? {};
  const mediaUrls = normalizeMediaUrls(report);
  const primaryMediaUrl = mediaUrls[0] ?? null;
  const primaryIsVideo = isVideoUrl(primaryMediaUrl);
  const primaryIsDocument = isDocumentUrl(primaryMediaUrl);
  const isOwner = report.user_id === currentUserId;
  const canManage = ["diputado", "presidente_junta", "super_admin"].includes(userRole);
  const [voted, setVoted] = useState(report.user_voted ?? false);
  const [votesCount, setVotesCount] = useState(report.votes_count ?? 0);
  const [voting, setVoting] = useState(false);

  async function handleVote(e) {
    e.stopPropagation();
    if (voting) return;
    setVoting(true);
    try {
      const data = await onVote(report.id);
      setVoted(data.voted);
      setVotesCount(data.votes_count);
    } catch (_) {}
    setVoting(false);
  }

  return (
    <article
      onClick={() => onOpen(report)}
      className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden hover:border-brand-teal/30 transition-all cursor-pointer"
    >
      <div className={`h-1 w-full ${cat.dot}`} />
      {primaryMediaUrl && !primaryIsVideo && !primaryIsDocument && <img src={primaryMediaUrl} alt="" className="w-full h-44 object-cover" />}
      {primaryMediaUrl && primaryIsVideo && (
        <div className="h-44 bg-black flex items-center justify-center relative">
          <i className="fas fa-play-circle text-white text-4xl opacity-70"></i>
          <video src={primaryMediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        </div>
      )}
      {primaryMediaUrl && primaryIsDocument && (
        <div className="h-44 flex flex-col items-center justify-center gap-3 bg-brand-cream dark:bg-brand-navy/30">
          <i className={`fas ${/\.pdf(\?|$)/i.test(primaryMediaUrl) ? "fa-file-pdf text-red-500" : "fa-file-word text-blue-500"} text-4xl`}></i>
          <span className="text-xs font-semibold text-brand-teal">Documento adjunto</span>
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.color}`}>
            <i className={`fas ${cat.icon} text-[10px]`}></i>
            {cat.label}
          </span>
          <StatusBadge status={report.status} />
          {report.justice_served && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-terracotta/10 text-brand-terracotta">
              <i className="fas fa-balance-scale text-[10px]"></i>
              Justicia
            </span>
          )}
        </div>

        <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-snug line-clamp-2">{report.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{report.description}</p>

        {report.location_text && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <i className="fas fa-map-marker-alt text-brand-terracotta text-[10px]"></i>
            <span className="truncate">{report.location_text}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-brand-teal/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold">
              {profile.avatar_initials ?? "US"}
            </div>
            <div>
              <p className="text-xs font-medium text-brand-navy dark:text-brand-cream">{profile.full_name ?? "Usuario"}</p>
              <p className="text-[10px] text-gray-400">{fmtDate(report.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleVote} disabled={voting} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${voted ? "bg-brand-terracotta/10 text-brand-terracotta border-brand-terracotta/20" : "bg-brand-cream dark:bg-brand-navy/30 text-gray-500 border-brand-teal/20 hover:text-brand-terracotta"}`}>
              <i className={`${voted ? "fas" : "far"} fa-thumbs-up text-[10px]`}></i>
              <span>{votesCount}</span>
            </button>
            {canManage && report.status !== "resuelta" && (
              <button onClick={() => onManage(report)} className="px-3 py-1.5 rounded-lg bg-brand-teal/10 hover:bg-brand-teal text-brand-teal hover:text-white text-xs font-semibold transition-all">
                <i className="fas fa-cogs mr-1"></i>Gestionar
              </button>
            )}
            {isOwner && report.status === "recibida" && (
              <button onClick={() => onDelete(report.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all">
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function CreateReportModal({ onClose, onSubmit, loading, error, uploadFile }) {
  const [form, setForm] = useState({ title: "", description: "", category: "otro", location_text: "", latitude: null, longitude: null });
  const [mediaItems, setMediaItems] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaNotice, setMediaNotice] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const mediaRef = useRef(null);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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
      (pos) => {
        setField("latitude", pos.coords.latitude);
        setField("longitude", pos.coords.longitude);
        setLocLoading(false);
      },
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="w-full max-w-lg bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-brand-teal/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <i className="fas fa-triangle-exclamation text-white"></i>
            </div>
            <div>
              <h2 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Nueva Denuncia</h2>
              <p className="text-xs text-gray-400">Reporta un hecho, riesgo o irregularidad</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Titulo *</label>
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Resume la denuncia brevemente" maxLength={150} className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-2">Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => setField("category", cat.value)} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm transition-all text-left ${form.category === cat.value ? `${cat.color} border-current` : "border-brand-teal/15 hover:border-brand-teal/30"}`}>
                  <i className={`fas ${cat.icon} text-xs w-4 text-center`}></i>
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Descripcion *</label>
            <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={4} maxLength={1000} placeholder="Describe que ocurrio, donde paso, a quienes afecta y cualquier detalle util..." className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm resize-none" />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Ubicacion</label>
            <input value={form.location_text} onChange={(e) => setField("location_text", e.target.value)} placeholder="Ej: Calle El Conde, Zona Colonial, Santo Domingo" className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm mb-2" />
            <button onClick={getLocation} type="button" disabled={locLoading} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium ${form.latitude ? "border-green-400 bg-green-50 dark:bg-green-900/10 text-green-600" : "border-brand-teal/30 hover:border-brand-teal text-brand-teal"} disabled:opacity-50`}>
              {locLoading ? <><i className="fas fa-spinner fa-spin"></i> Obteniendo...</> : form.latitude ? <><i className="fas fa-check-circle"></i> Ubicacion GPS obtenida</> : <><i className="fas fa-crosshairs"></i> Usar mi ubicacion GPS</>}
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-2">Evidencias</label>
            <button type="button" onClick={() => mediaRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-teal/30 text-sm font-medium text-gray-400 hover:text-brand-teal">
              <i className="fas fa-photo-film"></i> Subir varios archivos
            </button>
            <input ref={mediaRef} type="file" accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/quicktime,video/webm" multiple className="hidden" onChange={handleMediaSelect} />
            <p className="text-[11px] text-gray-400 mt-2">Puedes mezclar fotos, videos, PDF y Word en la misma denuncia. Maximo 8 archivos y 50MB por archivo.</p>
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

          {mediaError && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{mediaError}</div>}
          {error && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>

        <div className="p-4 border-t border-brand-teal/10">
          <button onClick={handleSubmit} disabled={!form.title.trim() || !form.description.trim() || loading || uploadingMedia} className="w-full py-3 btn-warm text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {loading || uploadingMedia ? <><i className="fas fa-spinner fa-spin"></i> Publicando...</> : <><i className="fas fa-paper-plane"></i> Publicar Denuncia</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageReportModal({ report, onClose, onSubmit, loading, error, uploadEvidence }) {
  const [status, setStatus] = useState(report.status === "recibida" ? "en_gestion" : "resuelta");
  const [resolutionNote, setResolutionNote] = useState("");
  const [justiceServed, setJusticeServed] = useState(Boolean(report.justice_served));
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceNotice, setEvidenceNotice] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
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
      report.id,
      status,
      resolutionNote,
      evidenceUploads[0]?.url ?? null,
      evidenceUploads[0]?.path ?? null,
      justiceServed,
      evidenceUploads,
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="w-full max-w-md bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-brand-teal/10 flex items-center justify-between">
          <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Gestionar Denuncia</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-brand-cream dark:bg-brand-navy/30 p-3 rounded-xl line-clamp-2">{report.title}</p>
          <div className="space-y-2">
            {STATUSES.filter((item) => item.value !== "recibida").map((item) => (
              <button key={item.value} type="button" onClick={() => setStatus(item.value)} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${status === item.value ? `${item.color} border-current` : "border-brand-teal/15 hover:border-brand-teal/30"}`}>
                <i className={`fas ${item.icon} text-sm w-5 text-center`}></i>
                <span className="font-semibold text-sm">{item.label}</span>
                {status === item.value && <i className="fas fa-check-circle ml-auto text-sm"></i>}
              </button>
            ))}
          </div>
          <textarea value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} rows={3} placeholder={status === "resuelta" ? "Describe como se resolvio la denuncia..." : "Describe las acciones que se estan tomando..."} className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm resize-none" />
          {status === "resuelta" && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-brand-terracotta/20 bg-brand-terracotta/10">
              <input type="checkbox" checked={justiceServed} onChange={(e) => setJusticeServed(e.target.checked)} className="w-4 h-4" />
              <div>
                <p className="text-sm font-semibold text-brand-navy dark:text-brand-cream">Se hizo justicia</p>
                <p className="text-xs text-gray-500">Marcala si hubo sancion, reparacion o accion formal.</p>
              </div>
            </label>
          )}
          <div onClick={() => evidenceRef.current?.click()} className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer border-brand-teal/30 hover:border-brand-teal text-gray-400">
            <i className="fas fa-folder-plus text-lg"></i>
            <div>
              <p className="text-sm font-medium">Subir varias fotos, PDF o videos</p>
              <p className="text-xs opacity-60">Max 50MB por archivo</p>
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
          <AttachmentPreviewGrid
            items={evidenceItems}
            onRemove={(id) => setEvidenceItems((prev) => {
              const next = prev.filter((item) => item.id !== id);
              const removed = prev.find((item) => item.id === id);
              cleanupAttachmentItems(removed ? [removed] : []);
              return next;
            })}
          />
          {evidenceError && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{evidenceError}</div>}
          {error && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>
        <div className="p-4 border-t border-brand-teal/10 flex gap-3">
          <button onClick={handleClose} className="flex-1 py-3 rounded-xl border border-brand-teal/20 text-gray-400 text-sm font-semibold">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || uploading || (status === "resuelta" && evidenceItems.length === 0)} className="flex-1 py-3 btn-warm text-white font-semibold rounded-xl text-sm disabled:opacity-50">
            {loading || uploading ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportDetailModal({ report, onClose, currentUserId, onComment, onDeleteComment }) {
  const { user, getReportComments } = useAuth();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (!report) return;
    getReportComments(report.id).then(setComments).catch(() => {});
  }, [getReportComments, report]);

  if (!report) return null;
  const cat = getCat(report.category);
  const profile = report.profile ?? {};
  const manager = report.manager ?? null;
  const mediaUrls = normalizeMediaUrls(report);
  const evidenceFiles = normalizeEvidenceFiles(report);

  async function handleComment() {
    if (!commentText.trim() || commenting) return;
    setCommenting(true);
    try {
      const comment = await onComment(report.id, commentText.trim());
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    } catch (_) {}
    setCommenting(false);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className={`${cat.dot} h-2 w-full`}></div>
        <div className="overflow-y-auto p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="pr-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.color}`}>
                  <i className={`fas ${cat.icon} text-[10px]`}></i>{cat.label}
                </span>
                <StatusBadge status={report.status} />
                {report.justice_served && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-terracotta/10 text-brand-terracotta"><i className="fas fa-balance-scale text-[10px]"></i>Justicia aplicada</span>}
              </div>
              <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">{report.title}</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{report.description}</p>
          <MediaGallery urls={mediaUrls} />

          {report.location_text && (
            <div className="p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ubicacion</p>
              <p className="text-sm text-brand-navy dark:text-brand-cream">{report.location_text}</p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Apoyos ciudadanos</p>
            <p className="text-sm font-bold text-brand-navy dark:text-brand-cream">{report.votes_count ?? 0} {(report.votes_count ?? 0) === 1 ? "persona apoya" : "personas apoyan"} esta denuncia</p>
          </div>

          <div className="p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Denuncia de</p>
            <p className="text-sm font-semibold text-brand-navy dark:text-brand-cream">{profile.full_name ?? "Usuario"}</p>
            <p className="text-xs text-gray-400">@{profile.username ?? "usuario"} · {fmtDate(report.created_at)}</p>
          </div>

          {report.status !== "recibida" && manager && (
            <div className={`p-4 rounded-xl border ${report.status === "resuelta" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2">{report.status === "resuelta" ? "Denuncia resuelta" : "En gestion"}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">Gestionado por <strong>{manager.full_name}</strong> · {fmtDate(report.managed_at)}</p>
              {report.resolution_note && <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-2">{report.resolution_note}</p>}
              {report.justice_served && <p className="mt-2 text-xs font-semibold text-brand-terracotta">Se hizo justicia en este caso.</p>}
              {evidenceFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {evidenceFiles.map((file, index) => (
                    <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-brand-navy/50 border border-brand-teal/20 text-xs font-semibold text-brand-teal hover:bg-brand-teal hover:text-white transition-all">
                      <i className={`fas ${file.kind === "pdf" ? "fa-file-pdf" : file.kind === "video" ? "fa-video" : "fa-image"}`}></i>
                      {file.name || `Evidencia ${index + 1}`}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-brand-teal/10 pt-4">
            <h4 className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Comentarios</h4>
            <div className="space-y-2.5 mb-3">
              {comments.length === 0 ? <p className="text-xs text-gray-400 text-center py-2">Se la primera persona en comentar</p> : comments.map((comment) => {
                const cp = comment.profiles ?? {};
                const isMyComment = comment.user_id === currentUserId;
                return (
                  <div key={comment.id} className="flex gap-2 group">
                    <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold shrink-0">{cp.avatar_initials ?? "US"}</div>
                    <div className="flex-1">
                      <div className="bg-brand-cream dark:bg-brand-navy/30 rounded-2xl px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-brand-navy dark:text-brand-cream">{cp.full_name ?? "Usuario"}</span>
                          <span className="text-[10px] text-gray-400">@{cp.username ?? "usuario"}</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-200">{comment.content}</p>
                      </div>
                      {isMyComment && <button onClick={() => onDeleteComment(report.id, comment.id).then(() => setComments((prev) => prev.filter((item) => item.id !== comment.id)))} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors ml-2 opacity-0 group-hover:opacity-100">Eliminar</button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold shrink-0">{user?.avatar_initials ?? "TU"}</div>
              <div className="flex-1 flex gap-2">
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()} placeholder="Escribe un comentario..." className="flex-1 px-3 py-2 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-xs" />
                <button onClick={handleComment} disabled={!commentText.trim() || commenting} className="w-8 h-8 rounded-full btn-warm flex items-center justify-center text-white disabled:opacity-40">{commenting ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-paper-plane text-xs"></i>}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Denuncias() {
  const {
    user,
    getReports,
    createReport,
    deleteReport,
    updateReportStatus,
    uploadReportEvidence,
    toggleReportVote,
    getReportComments,
    createReportComment,
    deleteReportComment,
    uploadFile,
  } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [manageModal, setManageModal] = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState("");
  const [detailModal, setDetailModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getReports({ status: statusFilter || undefined, category: catFilter || undefined });
      setReports(data);
    } catch (err) {
      setLoadError(err.message);
    }
    setLoading(false);
  }, [catFilter, getReports, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleCreate(form) {
    setCreateLoading(true);
    setCreateError("");
    try {
      const created = await createReport(form);
      setReports((prev) => [created, ...prev]);
      setCreateModal(false);
    } catch (err) {
      setCreateError(err.message);
    }
    setCreateLoading(false);
  }

  async function handleManage(reportId, status, note, evidenceUrl, evidencePath, justiceServed, evidenceFiles) {
    setManageLoading(true);
    setManageError("");
    try {
      const updated = await updateReportStatus(reportId, status, note, evidenceUrl, evidencePath, justiceServed, evidenceFiles);
      setReports((prev) => prev.map((item) => item.id === reportId ? updated : item));
      setManageModal(null);
    } catch (err) {
      setManageError(err.message);
    }
    setManageLoading(false);
  }

  const counts = {
    all: reports.length,
    recibida: reports.filter((item) => item.status === "recibida").length,
    en_gestion: reports.filter((item) => item.status === "en_gestion").length,
    resuelta: reports.filter((item) => item.status === "resuelta").length,
  };

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20">
              <i className="fas fa-arrow-left text-sm"></i>
            </a>
            <div className="w-9 h-9 rounded-xl gradient-bg-warm flex items-center justify-center">
              <i className="fas fa-triangle-exclamation text-white text-sm"></i>
            </div>
            <div>
              <h1 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-none">Denuncias Ciudadanas</h1>
              <p className="text-xs text-gray-400">{reports.length} denuncias</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/zonas-denuncias" className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-teal/20 text-brand-teal hover:bg-brand-teal/10 text-sm font-semibold transition-colors">
              <i className="fas fa-map-marked-alt"></i>
              <span>Zonas</span>
            </a>
            <button onClick={fetchReports} disabled={loading} className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20 disabled:opacity-40">
              <i className={`fas fa-sync-alt text-sm ${loading ? "fa-spin" : ""}`}></i>
            </button>
            {user?.email_verified !== false && (
              <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 px-4 py-2.5 btn-warm text-white font-semibold rounded-xl text-sm">
                <i className="fas fa-plus"></i>
                <span className="hidden sm:inline">Nueva Denuncia</span>
              </button>
            )}
            <NavMenu currentPath="/denuncias" />
          </div>
        </div>
      </header>

      <main className="pt-20 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex bg-brand-cream dark:bg-brand-navy/50 rounded-xl p-1 border border-brand-teal/10 gap-1 overflow-x-auto">
              {[
                { value: "", label: "Todas", count: counts.all },
                { value: "recibida", label: "Recibidas", count: counts.recibida },
                { value: "en_gestion", label: "En gestion", count: counts.en_gestion },
                { value: "resuelta", label: "Resueltas", count: counts.resuelta },
              ].map((filter) => (
                <button key={filter.value} onClick={() => setStatusFilter(filter.value)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${statusFilter === filter.value ? "bg-white dark:bg-brand-navy shadow-sm text-brand-teal font-semibold" : "text-gray-500 hover:text-brand-navy dark:hover:text-brand-cream"}`}>
                  {filter.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusFilter === filter.value ? "bg-brand-teal/10 text-brand-teal" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>{filter.count}</span>
                </button>
              ))}
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="flex-1 sm:max-w-xs px-4 py-2.5 rounded-xl bg-brand-cream dark:bg-brand-navy/50 border border-brand-teal/10 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm text-gray-600 dark:text-gray-300">
              <option value="">Todas las categorias</option>
              {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
          </div>

          {loadError && (
            <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <i className="fas fa-exclamation-circle shrink-0"></i>
              <span>{loadError}</span>
              <button onClick={fetchReports} className="ml-auto text-xs underline">Reintentar</button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="card-soft rounded-2xl h-64 animate-pulse border border-brand-teal/10" />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="card-soft rounded-2xl p-12 text-center border border-brand-teal/10">
              <i className="fas fa-triangle-exclamation text-brand-teal/30 text-5xl mb-4"></i>
              <p className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream mb-1">No hay denuncias {statusFilter ? "con este estado" : ""}</p>
              <p className="text-sm text-gray-400 mb-5">Se la primera persona en registrar una denuncia ciudadana.</p>
              <button onClick={() => setCreateModal(true)} className="inline-flex items-center gap-2 px-6 py-3 btn-warm text-white font-semibold rounded-xl text-sm">
                <i className="fas fa-plus"></i> Crear primera denuncia
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  currentUserId={user?.id}
                  userRole={user?.role}
                  onDelete={setConfirmDelete}
                  onManage={(item) => { setManageModal(item); setManageError(""); }}
                  onOpen={setDetailModal}
                  onVote={toggleReportVote}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {createModal && <CreateReportModal onClose={() => { setCreateModal(false); setCreateError(""); }} onSubmit={handleCreate} loading={createLoading} error={createError} uploadFile={uploadFile} />}
      {manageModal && <ManageReportModal report={manageModal} onClose={() => setManageModal(null)} onSubmit={handleManage} loading={manageLoading} error={manageError} uploadEvidence={uploadReportEvidence} />}
      <ReportDetailModal report={detailModal} onClose={() => setDetailModal(null)} currentUserId={user?.id} onComment={createReportComment} onDeleteComment={deleteReportComment} />
      {confirmDelete && <ConfirmModal title="Eliminar denuncia" message="Esta accion no se puede deshacer. Estas seguro de que quieres eliminar esta denuncia?" onConfirm={() => deleteReport(confirmDelete).then(() => setReports((prev) => prev.filter((item) => item.id !== confirmDelete))).finally(() => setConfirmDelete(null))} onCancel={() => setConfirmDelete(null)} />}
    </div>
  );
}
