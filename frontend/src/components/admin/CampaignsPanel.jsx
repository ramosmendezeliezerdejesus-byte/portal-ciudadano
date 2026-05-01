import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AttachmentPreviewGrid from "../AttachmentPreviewGrid";
import MediaGallery from "../MediaGallery";
import { useAuth } from "../../context/AuthContext";
import { cleanupAttachmentItems, mergeAttachmentFiles, uploadMediaItems } from "../../utils/attachments";
import { TOPIC_OPTIONS, topicLabel } from "../../utils/topics";

function normalizeCommunityKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EMPTY_FORM = {
  title: "",
  description: "",
  campaign_date: "",
  topic_key: "participacion",
  target_community: "",
  featured: true,
  active: true,
};

export default function CampaignsPanel({ onClose }) {
  const { getCampaigns, createCampaign, updateCampaign, deleteCampaign, notifyCampaign, uploadFile } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [existingFiles, setExistingFiles] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const mediaRef = useRef(null);

  const isEditing = Boolean(editingId);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCampaigns({ includeInactive: true });
      setCampaigns(data);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las campanas");
    }
    setLoading(false);
  }, [getCampaigns]);

  useEffect(() => {
    loadCampaigns();
    return () => cleanupAttachmentItems(mediaItems);
  }, [loadCampaigns]);

  function resetForm() {
    cleanupAttachmentItems(mediaItems);
    setForm(EMPTY_FORM);
    setExistingFiles([]);
    setMediaItems([]);
    setEditingId(null);
  }

  function startEdit(campaign) {
    cleanupAttachmentItems(mediaItems);
    setEditingId(campaign.id);
    setExistingFiles(Array.isArray(campaign.media_files) ? campaign.media_files : []);
    setMediaItems([]);
    setForm({
      title: campaign.title ?? "",
      description: campaign.description ?? "",
      campaign_date: campaign.campaign_date ?? "",
      topic_key: campaign.topic_key ?? "participacion",
      target_community: campaign.target_community ?? "",
      featured: Boolean(campaign.featured),
      active: campaign.active !== false,
    });
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      let uploadedFiles = existingFiles;
      if (mediaItems.length > 0) {
        uploadedFiles = await uploadMediaItems(mediaItems, uploadFile);
      }

      const payload = {
        ...form,
        media_files: uploadedFiles,
        target_community_key: form.target_community ? normalizeCommunityKey(form.target_community) : null,
      };

      if (isEditing) {
        const updated = await updateCampaign(editingId, payload);
        setCampaigns((prev) => prev.map((item) => item.id === editingId ? updated : item));
      } else {
        const created = await createCampaign(payload);
        setCampaigns((prev) => [created, ...prev]);
      }

      resetForm();
    } catch (err) {
      setError(err.message || "No se pudo guardar la campana");
    }
    setSaving(false);
  }

  async function handleDelete(campaignId) {
    try {
      await deleteCampaign(campaignId);
      setCampaigns((prev) => prev.filter((item) => item.id !== campaignId));
      if (editingId === campaignId) resetForm();
    } catch (err) {
      setError(err.message || "No se pudo eliminar la campana");
    }
  }

  async function handleToggle(campaign) {
    try {
      const updated = await updateCampaign(campaign.id, { active: !campaign.active });
      setCampaigns((prev) => prev.map((item) => item.id === campaign.id ? updated : item));
    } catch (err) {
      setError(err.message || "No se pudo actualizar la campana");
    }
  }

  async function handleNotify(campaignId) {
    try {
      await notifyCampaign(campaignId);
    } catch (err) {
      setError(err.message || "No se pudieron enviar las notificaciones");
    }
  }

  const orderedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => Number(b.featured) - Number(a.featured)),
    [campaigns],
  );

  return (
    <section className="space-y-5">
      <div className="card-soft overflow-hidden rounded-2xl border border-brand-teal/10 shadow-soft slide-in">
        <div className="border-b border-brand-teal/10 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-brand-navy dark:text-brand-cream">Gestion de campanas informativas</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300">
                Crea, edita, desactiva, destaca y difunde campanas por sector y por tema.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={loadCampaigns} className="rounded-xl border border-brand-teal/20 px-4 py-2.5 text-sm font-semibold text-brand-teal hover:bg-brand-teal/10">
                <i className={`fas fa-rotate mr-2 ${loading ? "fa-spin" : ""}`}></i>Actualizar
              </button>
              <button onClick={onClose} className="rounded-xl border border-brand-teal/20 px-4 py-2.5 text-sm text-gray-500 hover:text-brand-navy dark:hover:text-brand-cream">
                Cerrar
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">Titulo</label>
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-xl border border-brand-teal/20 bg-brand-cream px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal dark:bg-brand-navy/30" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">Fecha</label>
                <input type="date" value={form.campaign_date} onChange={(event) => setForm((prev) => ({ ...prev, campaign_date: event.target.value }))} className="w-full rounded-xl border border-brand-teal/20 bg-brand-cream px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal dark:bg-brand-navy/30" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">Tema</label>
                <select value={form.topic_key} onChange={(event) => setForm((prev) => ({ ...prev, topic_key: event.target.value }))} className="w-full rounded-xl border border-brand-teal/20 bg-brand-cream px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal dark:bg-brand-navy/30">
                  {TOPIC_OPTIONS.map((topic) => (
                    <option key={topic.value} value={topic.value}>{topic.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">Sector</label>
                <input value={form.target_community} onChange={(event) => setForm((prev) => ({ ...prev, target_community: event.target.value }))} placeholder="Ej: Los Mina Sur" className="w-full rounded-xl border border-brand-teal/20 bg-brand-cream px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal dark:bg-brand-navy/30" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">Descripcion</label>
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={5} className="w-full rounded-xl border border-brand-teal/20 bg-brand-cream px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal dark:bg-brand-navy/30" />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-brand-teal/20 bg-brand-cream px-4 py-3 text-sm dark:bg-brand-navy/30">
                <input type="checkbox" checked={form.featured} onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))} />
                Mostrar en la pagina principal
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-brand-teal/20 bg-brand-cream px-4 py-3 text-sm dark:bg-brand-navy/30">
                <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
                Campana activa
              </label>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Imagenes o videos</label>
              <button type="button" onClick={() => mediaRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-brand-teal/30 px-4 py-4 text-sm font-semibold text-brand-teal hover:bg-brand-teal/5">
                <i className="fas fa-photo-film mr-2"></i>Agregar multimedia
              </button>
              <input ref={mediaRef} type="file" multiple accept="image/*,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(event) => {
                setMediaItems((prev) => mergeAttachmentFiles(prev, event.target.files, "media", 6));
                event.target.value = "";
              }} />
              {existingFiles.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Multimedia actual</p>
                    <button type="button" onClick={() => setExistingFiles([])} className="text-xs font-semibold text-red-500">
                      Quitar actual
                    </button>
                  </div>
                  <MediaGallery urls={existingFiles.map((file) => file.url)} />
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

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button onClick={handleSubmit} disabled={saving} className="rounded-xl btn-warm px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Guardando..." : isEditing ? "Actualizar campana" : "Crear campana"}
              </button>
              {isEditing && (
                <button onClick={resetForm} type="button" className="rounded-xl border border-brand-teal/20 px-5 py-3 text-sm font-semibold text-gray-500 hover:text-brand-navy dark:hover:text-brand-cream">
                  Cancelar edicion
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-brand-teal/10 p-8 text-center text-sm text-gray-500">
                Cargando campanas...
              </div>
            ) : orderedCampaigns.length === 0 ? (
              <div className="rounded-2xl border border-brand-teal/10 p-8 text-center text-sm text-gray-500">
                Aun no hay campanas creadas.
              </div>
            ) : (
              orderedCampaigns.map((campaign) => (
                <article key={campaign.id} className="rounded-2xl border border-brand-teal/10 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-teal/10 px-2.5 py-1 text-[11px] font-semibold text-brand-teal">
                      {topicLabel(campaign.topic_key)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${campaign.active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                      {campaign.active ? "Activa" : "Inactiva"}
                    </span>
                    {campaign.featured && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        Destacada
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-brand-navy dark:text-brand-cream">{campaign.title}</h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{campaign.description}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {campaign.target_community || "Todos los sectores"} | {campaign.campaign_date || "Sin fecha"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => startEdit(campaign)} className="rounded-xl border border-brand-teal/20 px-3 py-2 text-xs font-semibold text-brand-teal hover:bg-brand-teal/10">
                      Editar
                    </button>
                    <button onClick={() => handleToggle(campaign)} className="rounded-xl border border-brand-teal/20 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-brand-teal/10 dark:text-gray-300">
                      {campaign.active ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={() => handleNotify(campaign.id)} className="rounded-xl border border-brand-teal/20 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20">
                      Enviar notificaciones
                    </button>
                    <button onClick={() => handleDelete(campaign.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                      Eliminar
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
