import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { toggleDark } from "../App";
import NavMenu from "../components/NavMenu";

const API = "http://localhost:5000/api";

const CATEGORIES = [
  { value: "",               label: "Todas",           icon: "fa-th",              color: "bg-brand-teal text-white",                                                    dot: "bg-brand-teal" },
  { value: "infraestructura",label: "Infraestructura", icon: "fa-road",            color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",   dot: "bg-orange-500" },
  { value: "seguridad",      label: "Seguridad",       icon: "fa-shield-alt",      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",               dot: "bg-red-500" },
  { value: "ambiente",       label: "Medio Ambiente",  icon: "fa-leaf",            color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",       dot: "bg-green-500" },
  { value: "educacion",      label: "Educación",       icon: "fa-graduation-cap",  color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",   dot: "bg-purple-500" },
  { value: "salud",          label: "Salud",           icon: "fa-heartbeat",       color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",           dot: "bg-pink-500" },
  { value: "transporte",     label: "Transporte",      icon: "fa-bus",             color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",           dot: "bg-blue-500" },
  { value: "otro",           label: "Otro",            icon: "fa-ellipsis-h",      color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",              dot: "bg-gray-400" },
];

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" });
}

function isVideo(url) {
  if (!url) return false;
  return url.match(/\.(mp4|webm|mov)(\?|$)/i);
}

function isPDF(url) {
  if (!url) return false;
  return url.match(/\.pdf(\?|$)/i);
}

// ── EvidenceCard ──────────────────────────────────────────────────────────────
function EvidenceCard({ item, onClick }) {
  const cat = CATEGORIES.find(c => c.value === item.category) ?? CATEGORIES[0];

  return (
    <article
      onClick={() => onClick(item)}
      className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden hover:border-brand-teal/30 hover:shadow-lg transition-all duration-200 cursor-pointer group"
    >
      {/* Thumbnail */}
      <div className="h-44 overflow-hidden relative bg-brand-cream dark:bg-brand-navy/30">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : isVideo(item.evidence_url) ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-900">
            <i className="fas fa-play-circle text-white text-4xl opacity-70"></i>
            <span className="text-white/60 text-xs">Video de evidencia</span>
          </div>
        ) : isPDF(item.evidence_url) ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <i className="fas fa-file-pdf text-red-400 text-4xl"></i>
            <span className="text-gray-400 text-xs">Documento PDF</span>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <i className="fas fa-file-image text-brand-teal/40 text-4xl"></i>
            <span className="text-gray-400 text-xs">Evidencia</span>
          </div>
        )}

        {/* Category badge over image */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.color}`}>
            <i className={`fas ${cat.icon} text-[10px]`}></i>
            {cat.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${item.case_type === "denuncia" ? "bg-brand-terracotta text-white" : "bg-brand-teal text-white"}`}>
            <i className={`fas ${item.case_type === "denuncia" ? "fa-triangle-exclamation" : "fa-bullhorn"} text-[10px]`}></i>
            {item.case_type === "denuncia" ? "Denuncia" : "Propuesta"}
          </span>
        </div>

        {/* Resolved badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${item.justice_served ? "bg-brand-terracotta text-white" : "bg-green-500 text-white"}`}>
            <i className={`fas ${item.justice_served ? "fa-balance-scale" : "fa-check-circle"} text-[9px]`}></i> {item.justice_served ? "Justicia" : "Resuelta"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-sm leading-snug line-clamp-2 group-hover:text-brand-teal transition-colors">
          {item.title}
        </h3>

        {item.resolution_note && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {item.resolution_note}
          </p>
        )}

        {item.location_text && (
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <i className="fas fa-map-marker-alt text-brand-terracotta"></i>
            {item.location_text}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-brand-teal/10">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full avatar-teal flex items-center justify-center text-white text-[9px] font-bold">
              {item.gestor_initials ?? "US"}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-brand-navy dark:text-brand-cream leading-none">{item.gestor_name ?? "Gestor"}</p>
              <p className="text-[9px] text-gray-400">{fmtDate(item.managed_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-brand-teal">
            {isVideo(item.evidence_url) && <i className="fas fa-video text-xs"></i>}
            {isPDF(item.evidence_url)   && <i className="fas fa-file-pdf text-xs text-red-400"></i>}
            {!isVideo(item.evidence_url) && !isPDF(item.evidence_url) && <i className="fas fa-image text-xs"></i>}
            <i className="fas fa-external-link-alt text-[10px]"></i>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── EvidenceDetailModal ───────────────────────────────────────────────────────
function EvidenceDetailModal({ item, onClose }) {
  if (!item) return null;
  const cat = CATEGORIES.find(c => c.value === item.category) ?? CATEGORIES[0];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white dark:bg-brand-navy rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className={`${cat.dot} h-1.5 w-full shrink-0`} />

        <div className="overflow-y-auto scrollbar-hide">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${cat.color}`}>
                  <i className={`fas ${cat.icon} text-[10px]`}></i>{cat.label}
                </span>
                <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream leading-tight">
                  {item.title}
                </h2>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 shrink-0">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Descripción */}
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
            )}

            {/* Evidencia */}
            <div className="rounded-xl overflow-hidden border border-brand-teal/10">
              {isVideo(item.evidence_url) ? (
                <video src={item.evidence_url} controls className="w-full max-h-64 bg-black" />
              ) : isPDF(item.evidence_url) ? (
                <div className="flex items-center gap-4 p-5 bg-red-50 dark:bg-red-900/20">
                  <div className="w-14 h-14 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <i className="fas fa-file-pdf text-red-500 text-2xl"></i>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream">Documento PDF de evidencia</p>
                    <p className="text-xs text-gray-400 mt-0.5">Haz clic para ver el documento completo</p>
                  </div>
                </div>
              ) : (
                <img src={item.evidence_url} alt="Evidencia" className="w-full max-h-64 object-cover" />
              )}
            </div>

            {/* Ver evidencia completa */}
            <a
              href={item.evidence_url}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-brand-teal/20 text-brand-teal hover:bg-brand-teal hover:text-white font-semibold text-sm transition-all"
            >
              <i className="fas fa-external-link-alt"></i>
              Ver evidencia completa
            </a>

            {/* Nota de resolución */}
            {item.resolution_note && (
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                  <i className="fas fa-check-circle mr-1"></i>Nota de resolución
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item.resolution_note}</p>
              </div>
            )}

            {/* Ubicación */}
            {item.location_text && (
              <div className="flex items-center gap-3 p-3 bg-brand-cream dark:bg-brand-navy/30 rounded-xl">
                <i className="fas fa-map-marker-alt text-brand-terracotta text-lg shrink-0"></i>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Ubicación</p>
                  <p className="text-sm text-brand-navy dark:text-brand-cream">{item.location_text}</p>
                </div>
              </div>
            )}

            {/* Info gestor y autor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-brand-cream dark:bg-brand-navy/30 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1.5">Propuesto por</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {item.autor_initials ?? "US"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-navy dark:text-brand-cream">{item.autor_name ?? "Usuario"}</p>
                    <p className="text-[10px] text-gray-400">@{item.autor_username}</p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1.5">Resuelto por</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {item.gestor_initials ?? "US"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-navy dark:text-brand-cream">{item.gestor_name ?? "Gestor"}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(item.managed_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Biblioteca ────────────────────────────────────────────────────────────────
export default function Biblioteca() {
  const { token } = useAuth();
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [category,   setCategory]   = useState("");
  const [caseType,   setCaseType]   = useState("");
  const [search,     setSearch]     = useState("");
  const [detail,     setDetail]     = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (caseType) params.set("type", caseType);
      if (search)   params.set("search", search);
      const res  = await fetch(`${API}/biblioteca?${params}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [caseType, category, search, token]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Agrupar por categoría para mostrar conteos
  const countByCategory = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20">
              <i className="fas fa-arrow-left text-sm"></i>
            </a>
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
              <i className="fas fa-book text-white text-sm"></i>
            </div>
            <div>
              <h1 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-none">Biblioteca de Evidencias</h1>
              <p className="text-xs text-gray-400">{items.length} casos resueltos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchItems} disabled={loading} className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20 disabled:opacity-40">
              <i className={`fas fa-sync-alt text-sm ${loading ? "fa-spin" : ""}`}></i>
            </button>
            <NavMenu currentPath="/biblioteca" />
          </div>
        </div>
      </header>

      <main className="pt-20 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Hero banner */}
          <div className="gradient-bg rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <i className="fas fa-book-open text-2xl opacity-80"></i>
                <h2 className="font-serif font-bold text-xl">Biblioteca de Evidencias</h2>
              </div>
              <p className="text-white/80 text-sm max-w-lg">
                Aquí encontrarás todas las propuestas ciudadanas que han sido resueltas, junto con la evidencia y documentación que demuestra su cumplimiento.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{items.length}</p>
                  <p className="text-white/70 text-xs">Total resueltas</p>
                </div>
                {Object.entries(countByCategory).slice(0, 3).map(([cat, count]) => {
                  const catObj = CATEGORIES.find(c => c.value === cat);
                  return catObj ? (
                    <div key={cat} className="text-center">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-white/70 text-xs">{catObj.label}</p>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10">
              <i className="fas fa-book-open text-9xl absolute right-4 top-4"></i>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título de propuesta..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-brand-navy/50 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm transition-all shadow-soft"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { value: "", label: "Todo" },
              { value: "propuesta", label: "Propuestas" },
              { value: "denuncia", label: "Denuncias" },
            ].map(type => (
              <button
                key={type.value}
                onClick={() => setCaseType(type.value)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${caseType === type.value ? "bg-brand-teal text-white border-brand-teal" : "border-brand-teal/20 text-brand-teal hover:bg-brand-teal/5"}`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Categorías */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {CATEGORIES.map(cat => {
              const count = cat.value === "" ? items.length : (countByCategory[cat.value] ?? 0);
              const isActive = category === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                    isActive
                      ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                      : "border-brand-teal/10 hover:border-brand-teal/30 card-soft"
                  }`}
                >
                  <i className={`fas ${cat.icon} text-lg ${isActive ? "text-brand-teal" : "text-gray-400"}`}></i>
                  <span className={`text-[10px] font-semibold leading-tight ${isActive ? "text-brand-teal" : "text-gray-500"}`}>
                    {cat.label}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-brand-teal text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <i className="fas fa-exclamation-circle shrink-0"></i>
              <span>{error}</span>
              <button onClick={fetchItems} className="ml-auto text-xs underline">Reintentar</button>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="card-soft rounded-2xl h-64 animate-pulse border border-brand-teal/10" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="card-soft rounded-2xl p-14 text-center border border-brand-teal/10">
              <i className="fas fa-book text-brand-teal/30 text-5xl mb-4"></i>
              <p className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream mb-1">
                {search ? "No se encontraron resultados" : "Aún no hay evidencias en esta categoría"}
              </p>
              <p className="text-sm text-gray-400">
                {search ? "Intenta con otros términos de búsqueda." : "Cuando una propuesta sea resuelta aparecerá aquí."}
              </p>
              {search && (
                <button onClick={() => setSearch("")} className="mt-4 px-5 py-2 rounded-xl border border-brand-teal/20 text-brand-teal text-sm hover:bg-brand-teal/5 transition-colors">
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <EvidenceCard key={item.id} item={item} onClick={setDetail} />
              ))}
            </div>
          )}
        </div>
      </main>

      <EvidenceDetailModal item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
