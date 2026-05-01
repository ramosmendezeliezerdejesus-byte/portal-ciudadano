import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import NavMenu from "../components/NavMenu";
import AttachmentPreviewGrid from "../components/AttachmentPreviewGrid";
import MediaGallery from "../components/MediaGallery";
import { mergeAttachmentFiles, cleanupAttachmentItems, uploadEvidenceItems, uploadMediaItems } from "../utils/attachments";
import { isDocumentUrl, isVideoUrl, normalizeEvidenceFiles, normalizeMediaUrls } from "../utils/media";

const CATEGORIES = [
  { value: "electricidad", label: "Electricidad", icon: "fa-bolt", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", dot: "bg-yellow-400" },
  { value: "agua", label: "Agua", icon: "fa-tint", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", dot: "bg-blue-500" },
  { value: "basura", label: "Basura", icon: "fa-trash", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", dot: "bg-emerald-500" },
  { value: "alumbrado", label: "Alumbrado", icon: "fa-lightbulb", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", dot: "bg-amber-500" },
  { value: "alcantarillado", label: "Alcantarillado", icon: "fa-water", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300", dot: "bg-cyan-500" },
  { value: "calles", label: "Calles", icon: "fa-road", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", dot: "bg-orange-500" },
  { value: "transporte", label: "Transporte", icon: "fa-bus", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", dot: "bg-violet-500" },
  { value: "otro", label: "Otro", icon: "fa-ellipsis-h", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", dot: "bg-gray-400" },
];

const STATUSES = [
  { value: "recibida", label: "Recibida", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "en_gestion", label: "En gestion", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "resuelta", label: "Resuelta", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
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

function RequestCard({ item, currentUserId, userRole, onDelete, onManage, onOpen, onSupport }) {
  const cat = getCat(item.category);
  const status = getStatus(item.status);
  const profile = item.profile ?? {};
  const mediaUrls = normalizeMediaUrls(item);
  const primaryMediaUrl = mediaUrls[0] ?? null;
  const primaryIsVideo = isVideoUrl(primaryMediaUrl);
  const primaryIsDocument = isDocumentUrl(primaryMediaUrl);
  const isOwner = item.user_id === currentUserId;
  const canManage = ["diputado", "presidente_junta", "super_admin"].includes(userRole);
  const [supported, setSupported] = useState(item.user_supported ?? false);
  const [supportsCount, setSupportsCount] = useState(item.supports_count ?? 0);
  const [supporting, setSupporting] = useState(false);

  async function handleSupport(e) {
    e.stopPropagation();
    if (supporting) return;
    setSupporting(true);
    try {
      const data = await onSupport(item.id);
      setSupported(data.supported);
      setSupportsCount(data.supports_count);
    } catch (_) {}
    setSupporting(false);
  }

  return (
    <article
      onClick={() => onOpen(item)}
      className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden hover:border-brand-teal/30 transition-all cursor-pointer"
    >
      <div className={`h-1.5 w-full ${cat.dot}`}></div>
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
            <i className={`fas ${cat.icon} text-[10px]`}></i>{cat.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
            {status.label}
          </span>
        </div>
        <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-snug line-clamp-2">{item.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
        {item.location_text && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <i className="fas fa-map-marker-alt text-brand-terracotta text-[10px]"></i>
            <span className="truncate">{item.location_text}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-brand-teal/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold">
              {profile.avatar_initials ?? "US"}
            </div>
            <div>
              <p className="text-xs font-medium text-brand-navy dark:text-brand-cream">{profile.full_name ?? "Usuario"}</p>
              <p className="text-[10px] text-gray-400">{fmtDate(item.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleSupport} disabled={supporting} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${supported ? "bg-brand-terracotta/10 text-brand-terracotta border-brand-terracotta/20" : "bg-brand-cream dark:bg-brand-navy/30 text-gray-500 border-brand-teal/20 hover:text-brand-terracotta"}`}>
              <i className={`${supported ? "fas" : "far"} fa-hand-holding-heart text-[10px]`}></i>
              <span>{supportsCount}</span>
            </button>
            {canManage && item.status !== "resuelta" && (
              <button onClick={() => onManage(item)} className="px-3 py-1.5 rounded-lg bg-brand-teal/10 hover:bg-brand-teal text-brand-teal hover:text-white text-xs font-semibold transition-all">
                <i className="fas fa-cogs mr-1"></i>Gestionar
              </button>
            )}
            {isOwner && item.status === "recibida" && (
              <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all">
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function CreateRequestModal({ onClose, onSubmit, loading, error, uploadFile }) {
  const [form, setForm] = useState({ title: "", description: "", category: "electricidad", location_text: "", latitude: null, longitude: null });
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
              <i className="fas fa-bolt text-white"></i>
            </div>
            <div>
              <h2 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Nueva solicitud</h2>
              <p className="text-xs text-gray-400">Pide un servicio publico para tu sector</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Titulo *</label>
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Ej: Devuelvan la luz en el sector" maxLength={150} className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm" />
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
            <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={4} maxLength={1000} placeholder="Explica que servicio falta, cuanto tiempo lleva el problema y a quienes afecta..." className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">Ubicacion</label>
            <input value={form.location_text} onChange={(e) => setField("location_text", e.target.value)} placeholder="Ej: Los Mina Sur, calle central" className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm mb-2" />
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
            <p className="text-[11px] text-gray-400 mt-2">Puedes mezclar fotos, videos, PDF y Word en la misma solicitud. Maximo 8 archivos y 50MB por archivo.</p>
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
            {loading || uploadingMedia ? <><i className="fas fa-spinner fa-spin"></i> Publicando...</> : <><i className="fas fa-paper-plane"></i> Publicar solicitud</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageRequestModal({ item, onClose, onSubmit, loading, error, uploadEvidence }) {
  const [status, setStatus] = useState(item.status === "recibida" ? "en_gestion" : "resuelta");
  const [resolutionNote, setResolutionNote] = useState("");
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
      item.id,
      status,
      resolutionNote,
      evidenceUploads[0]?.url ?? null,
      evidenceUploads[0]?.path ?? null,
      evidenceUploads,
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="w-full max-w-md bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-brand-teal/10 flex items-center justify-between">
          <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Gestionar solicitud</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-brand-cream dark:bg-brand-navy/30 p-3 rounded-xl line-clamp-2">{item.title}</p>
          <div className="space-y-2">
            {STATUSES.filter((entry) => entry.value !== "recibida").map((entry) => (
              <button key={entry.value} type="button" onClick={() => setStatus(entry.value)} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${status === entry.value ? `${entry.color} border-current` : "border-brand-teal/15 hover:border-brand-teal/30"}`}>
                <span className="font-semibold text-sm">{entry.label}</span>
                {status === entry.value && <i className="fas fa-check-circle ml-auto text-sm"></i>}
              </button>
            ))}
          </div>
          <textarea value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} rows={3} placeholder={status === "resuelta" ? "Describe como se resolvio o se atendio la solicitud..." : "Describe las acciones que se estan tomando..."} className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm resize-none" />
          <div onClick={() => evidenceRef.current?.click()} className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer border-brand-teal/30 hover:border-brand-teal text-gray-400">
            <i className="fas fa-folder-plus text-lg"></i>
            <div>
              <p className="text-sm font-medium">Subir varias evidencias</p>
              <p className="text-xs opacity-60">Fotos, PDF o videos. Obligatorio al resolver.</p>
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
              const next = prev.filter((entry) => entry.id !== id);
              const removed = prev.find((entry) => entry.id === id);
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

function RequestDetailModal({ item, onClose, onComment, onDeleteComment }) {
  const { user, getServiceRequestComments } = useAuth();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (!item) return;
    getServiceRequestComments(item.id).then(setComments).catch(() => {});
  }, [getServiceRequestComments, item]);

  if (!item) return null;
  const cat = getCat(item.category);
  const status = getStatus(item.status);
  const profile = item.profile ?? {};
  const manager = item.manager ?? null;
  const mediaUrls = normalizeMediaUrls(item);
  const evidenceFiles = normalizeEvidenceFiles(item);

  async function handleComment() {
    if (!commentText.trim() || commenting) return;
    setCommenting(true);
    try {
      const comment = await onComment(item.id, commentText.trim());
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
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">{item.title}</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
          <MediaGallery urls={mediaUrls} />
          {item.location_text && (
            <div className="p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ubicacion</p>
              <p className="text-sm text-brand-navy dark:text-brand-cream">{item.location_text}</p>
            </div>
          )}
          {item.resolution_note && (
            <div className="p-4 rounded-xl border border-brand-teal/10 bg-brand-teal/5">
              <p className="text-xs uppercase tracking-wide text-brand-teal mb-2">Respuesta de gestion</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{item.resolution_note}</p>
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
              {manager && (
                <p className="text-xs text-gray-400 mt-2">
                  Gestionado por {manager.full_name} {manager.role ? `(${manager.role})` : ""}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 pt-2 border-t border-brand-teal/10">
            <div className="w-10 h-10 rounded-full avatar-teal flex items-center justify-center text-white font-bold">{profile.avatar_initials ?? "US"}</div>
            <div>
              <p className="text-sm font-semibold text-brand-navy dark:text-brand-cream">{profile.full_name ?? "Usuario"}</p>
              <p className="text-xs text-gray-400">@{profile.username ?? "usuario"} · {fmtDate(item.created_at)}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-brand-teal/10 space-y-3">
            <h3 className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream">Comentarios</h3>
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-brand-teal/20 p-4 text-sm text-gray-500 text-center">
                  Todavia no hay comentarios en esta solicitud.
                </div>
              ) : comments.map((comment) => (
                <div key={comment.id} className="p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold">
                        {comment.profiles?.avatar_initials ?? "US"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-brand-navy dark:text-brand-cream">{comment.profiles?.full_name ?? "Usuario"}</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(comment.created_at)}</p>
                      </div>
                    </div>
                    {comment.user_id === user?.id && (
                      <button onClick={() => onDeleteComment(item.id, comment.id).then(() => setComments((prev) => prev.filter((entry) => entry.id !== comment.id))).catch(() => {})} className="text-red-400 hover:text-red-500 text-xs">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-line">{comment.content}</p>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3} placeholder="Escribe un comentario o agrega contexto..." className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm resize-none" />
              <button onClick={handleComment} disabled={!commentText.trim() || commenting} className="mt-2 px-4 py-2 btn-warm text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {commenting ? "Comentando..." : "Comentar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SolicitudesServicios() {
  const {
    user,
    getServiceRequests, createServiceRequest, deleteServiceRequest, updateServiceRequestStatus, toggleServiceRequestSupport,
    getServiceRequestComments, createServiceRequestComment, deleteServiceRequestComment,
    uploadFile, uploadServiceRequestEvidence,
  } = useAuth();

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [managing, setManaging] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getServiceRequests({ status: statusFilter || undefined, category: categoryFilter || undefined });
      setItems(data);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las solicitudes");
    }
    setLoading(false);
  }, [getServiceRequests, statusFilter, categoryFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleCreate(form) {
    setSubmitting(true);
    setError("");
    try {
      const created = await createServiceRequest(form);
      setItems((prev) => [created, ...prev]);
      setShowCreate(false);
    } catch (err) {
      setError(err.message || "No se pudo crear la solicitud");
    }
    setSubmitting(false);
  }

  async function handleDelete(requestId) {
    try {
      await deleteServiceRequest(requestId);
      setItems((prev) => prev.filter((item) => item.id !== requestId));
      if (selected?.id === requestId) setSelected(null);
    } catch (err) {
      setError(err.message || "No se pudo eliminar la solicitud");
    }
  }

  async function handleManage(requestId, status, resolutionNote, evidenceUrl, evidencePath, evidenceFiles) {
    setSubmitting(true);
    try {
      const updated = await updateServiceRequestStatus(requestId, status, resolutionNote, evidenceUrl, evidencePath, evidenceFiles);
      setItems((prev) => prev.map((item) => item.id === requestId ? updated : item));
      if (selected?.id === requestId) setSelected(updated);
      setManaging(null);
    } catch (err) {
      setError(err.message || "No se pudo actualizar la solicitud");
    }
    setSubmitting(false);
  }

  async function handleComment(requestId, content) {
    return createServiceRequestComment(requestId, content);
  }

  async function handleDeleteComment(requestId, commentId) {
    return deleteServiceRequestComment(requestId, commentId);
  }

  const canManage = ["diputado", "presidente_junta", "super_admin"].includes(user?.role);

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="w-9 h-9 rounded-xl bg-brand-cream dark:bg-brand-navy/50 flex items-center justify-center hover:bg-brand-teal/10 transition-colors border border-brand-teal/20 text-brand-navy dark:text-brand-cream">
              <i className="fas fa-arrow-left text-sm"></i>
            </a>
            <div className="flex items-center gap-2">
              <i className="fas fa-bolt text-brand-teal text-xl"></i>
              <span className="font-serif font-bold text-brand-navy dark:text-brand-cream text-lg hidden sm:block">Solicitudes de Servicios</span>
            </div>
          </div>
          <NavMenu currentPath="/solicitudes-servicios" />
        </div>
      </header>

      <main className="pt-20 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 space-y-5">
          <section className="card-soft rounded-2xl p-6 border border-brand-teal/10 shadow-soft slide-in">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-teal mb-2">Canal publico</p>
                <h1 className="font-serif font-bold text-2xl text-brand-navy dark:text-brand-cream">Solicita servicios para tu sector</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-3xl">
                  Usa este canal para pedir luz, agua, recogida de basura, alumbrado, drenaje o mejoras de calles cuando un servicio falte o funcione mal en tu zona.
                </p>
              </div>
              <div className="flex gap-3">
                {canManage && (
                  <div className="px-4 py-3 rounded-2xl bg-brand-teal/10 border border-brand-teal/20 text-sm text-brand-teal font-semibold">
                    <i className="fas fa-cogs mr-2"></i>Puedes gestionar solicitudes
                  </div>
                )}
                <button onClick={() => setShowCreate(true)} className="px-5 py-3 btn-warm text-white rounded-2xl font-semibold">
                  <i className="fas fa-plus mr-2"></i>Nueva solicitud
                </button>
              </div>
            </div>
          </section>

          <section className="card-soft rounded-2xl p-4 border border-brand-teal/10 shadow-soft">
            <div className="flex flex-col md:flex-row gap-3">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 text-sm focus:ring-2 focus:ring-brand-teal focus:outline-none">
                <option value="">Todos los estados</option>
                {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 text-sm focus:ring-2 focus:ring-brand-teal focus:outline-none">
                <option value="">Todas las categorias</option>
                {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="card-soft rounded-2xl p-10 border border-brand-teal/10 shadow-soft text-center text-gray-500">
              Cargando solicitudes...
            </div>
          ) : items.length === 0 ? (
            <div className="card-soft rounded-2xl p-10 border border-brand-teal/10 shadow-soft text-center">
              <i className="fas fa-bolt text-brand-teal/40 text-4xl mb-3"></i>
              <p className="text-gray-500">Aun no hay solicitudes de servicios publicos en esta vista.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map((item) => (
                <RequestCard
                  key={item.id}
                  item={item}
                  currentUserId={user?.id}
                  userRole={user?.role}
                  onDelete={handleDelete}
                  onManage={setManaging}
                  onOpen={setSelected}
                  onSupport={toggleServiceRequestSupport}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateRequestModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          loading={submitting}
          error={error}
          uploadFile={uploadFile}
        />
      )}
      {managing && (
        <ManageRequestModal
          item={managing}
          onClose={() => setManaging(null)}
          onSubmit={handleManage}
          loading={submitting}
          error={error}
          uploadEvidence={uploadServiceRequestEvidence}
        />
      )}
      {selected && (
        <RequestDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onComment={handleComment}
          onDeleteComment={handleDeleteComment}
        />
      )}
    </div>
  );
}
