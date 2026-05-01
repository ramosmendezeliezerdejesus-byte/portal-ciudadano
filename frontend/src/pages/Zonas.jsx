import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { useAuth } from "../context/AuthContext";
import NavMenu from "../components/NavMenu";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const API = "http://localhost:5000/api";
const RD_CENTER = [18.7357, -70.1627];

const CATEGORIES = [
  { value: "", label: "Todas", icon: "fa-th", color: "#3d6b7d" },
  { value: "infraestructura", label: "Infraestructura", icon: "fa-road", color: "#f97316" },
  { value: "seguridad", label: "Seguridad", icon: "fa-shield-alt", color: "#ef4444" },
  { value: "ambiente", label: "Medio Ambiente", icon: "fa-leaf", color: "#22c55e" },
  { value: "educacion", label: "Educacion", icon: "fa-graduation-cap", color: "#a855f7" },
  { value: "salud", label: "Salud", icon: "fa-heartbeat", color: "#ec4899" },
  { value: "transporte", label: "Transporte", icon: "fa-bus", color: "#3b82f6" },
  { value: "otro", label: "Otro", icon: "fa-ellipsis-h", color: "#6b7280" },
];

const STATUS_META = {
  recibida: { label: "Recibida", color: "#f59e0b" },
  en_gestion: { label: "En gestion", color: "#3b82f6" },
  resuelta: { label: "Resuelta", color: "#22c55e" },
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function locationLabel(proposal) {
  if (!proposal?.location_text) return "Ubicacion sin nombre";
  return proposal.location_text.split(",")[0].trim().slice(0, 36) || "Ubicacion sin nombre";
}

function categoryMeta(category) {
  return CATEGORIES.find((item) => item.value === category) ?? CATEGORIES[CATEGORIES.length - 1];
}

function statusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.recibida;
}

function createCustomIcon(category, status) {
  const cat = categoryMeta(category);
  const st = statusMeta(status);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
        fill="${cat.color}" stroke="${st.color}" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="8" fill="white" opacity="0.9"/>
    </svg>
  `;
  return L.divIcon({
    html: `<div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${svg}</div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    className: "",
  });
}

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 13, { duration: 1.2 });
    }
  }, [map, position]);
  return null;
}

function ProposalPopup({ proposal }) {
  const cat = categoryMeta(proposal.category);
  const st = statusMeta(proposal.status);

  return (
    <div style={{ minWidth: 220, maxWidth: 260 }}>
      {proposal.image_url && (
        <img
          src={proposal.image_url}
          alt=""
          style={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 8, marginBottom: 8 }}
        />
      )}
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ background: proposal.case_type === "denuncia" ? "#c4714d22" : "#3d6b7d22", color: proposal.case_type === "denuncia" ? "#c4714d" : "#3d6b7d", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
          {proposal.case_type === "denuncia" ? "Denuncia" : "Propuesta"}
        </span>
        <span style={{ background: `${cat.color}22`, color: cat.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
          {cat.label}
        </span>
        <span style={{ background: `${st.color}22`, color: st.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
          {st.label}
        </span>
      </div>
      <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 4px", color: "#2d3e50" }}>{proposal.title}</p>
      {proposal.description && (
        <p style={{ fontSize: 11, color: "#666", margin: "0 0 6px", lineHeight: 1.4 }}>
          {proposal.description.slice(0, 120)}{proposal.description.length > 120 ? "..." : ""}
        </p>
      )}
      {proposal.location_text && (
        <p style={{ fontSize: 10, color: "#999", margin: 0 }}>
          {proposal.location_text}
        </p>
      )}
    </div>
  );
}

const PIE_COLORS = ["#3d6b7d", "#c4714d", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#f59e0b"];

function ZonesChartPanel({
  chartData,
  hotspot,
  topHotspots,
  categoryChartData,
  statusChartData,
  summary,
  onViewHotspot,
}) {
  return (
    <div className="space-y-4">
      <div className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden">
        <div className="p-5 border-b border-brand-teal/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <i className="fas fa-chart-pie text-white text-sm"></i>
          </div>
          <div>
            <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Dashboard territorial</h3>
            <p className="text-xs text-gray-400">Resumen de propuestas y denuncias ubicadas en el mapa</p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-brand-teal/10 bg-brand-cream dark:bg-brand-navy/30 p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Geolocalizadas</p>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-cream mt-2">{summary.total}</p>
            <p className="text-xs text-gray-500 mt-1">casos con coordenadas</p>
          </div>

          <div className="rounded-2xl border border-brand-teal/10 bg-brand-cream dark:bg-brand-navy/30 p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Zonas unicas</p>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-cream mt-2">{summary.uniqueLocations}</p>
            <p className="text-xs text-gray-500 mt-1">ubicaciones detectadas</p>
          </div>

          <div className="rounded-2xl border border-brand-terracotta/20 bg-brand-terracotta/10 p-4 col-span-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Zona con mas casos</p>
            <div className="flex items-start justify-between gap-3 mt-2">
              <div>
                <p className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream">
                  {summary.leadingZone?.name ?? "Sin datos"}
                </p>
                <p className="text-sm text-brand-terracotta font-semibold mt-1">
                  {summary.leadingZone?.count ?? 0} caso{summary.leadingZone?.count === 1 ? "" : "s"}
                </p>
              </div>
              {hotspot && (
                <button
                  onClick={() => onViewHotspot(hotspot)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-brand-terracotta text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Ir al mapa
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden">
        <div className="p-5 border-b border-brand-teal/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg-warm flex items-center justify-center">
            <i className="fas fa-chart-bar text-white text-sm"></i>
          </div>
          <div>
            <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Zonas con mas demanda</h3>
            <p className="text-xs text-gray-400">Ranking de ubicaciones con mas propuestas y denuncias</p>
          </div>
        </div>

        <div className="p-5">
          {chartData.length === 0 ? (
            <div className="text-center py-10">
              <i className="fas fa-chart-bar text-brand-teal/30 text-4xl mb-3"></i>
              <p className="text-gray-400 text-sm">No hay suficientes direcciones escritas para construir el grafico.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d6b7d22" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={78}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} width={30} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.97)",
                      border: "1px solid #3d6b7d22",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value) => [`${value} caso${value === 1 ? "" : "s"}`, "Incidencias"]}
                    labelStyle={{ fontWeight: 700, color: "#2d3e50" }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={52}>
                    {chartData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={index === 0 ? "#c4714d" : index === 1 ? "#d38a67" : index === 2 ? "#e3aa8f" : "#3d6b7d"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-3 gap-3 mt-4">
                {chartData.slice(0, 3).map((item, index) => (
                  <div key={item.name} className={`p-3 rounded-xl text-center border ${
                    index === 0 ? "bg-brand-terracotta/10 border-brand-terracotta/20" :
                    index === 1 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" :
                    "bg-brand-cream dark:bg-brand-navy/30 border-brand-teal/10"
                  }`}>
                    <p className="text-2xl font-bold mb-1">{index + 1}</p>
                    <p className="text-xs font-semibold text-brand-navy dark:text-brand-cream leading-tight line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-lg font-bold mt-1 text-brand-terracotta">{item.count}</p>
                    <p className="text-[10px] text-gray-400">caso{item.count === 1 ? "" : "s"}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-1">
        <div className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden">
          <div className="p-5 border-b border-brand-teal/10">
            <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Distribucion por categoria</h3>
            <p className="text-xs text-gray-400 mt-1">Que tipo de caso domina en el territorio</p>
          </div>
          <div className="p-5">
            {categoryChartData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No hay categorias para mostrar.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {categoryChartData.map((item, index) => (
                      <Cell key={item.name} fill={item.color ?? PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} caso${value === 1 ? "" : "s"}`, "Categoria"]} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden">
          <div className="p-5 border-b border-brand-teal/10">
            <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Estado de las incidencias</h3>
            <p className="text-xs text-gray-400 mt-1">Como se reparten entre recibidas, en gestion y resueltas</p>
          </div>
          <div className="p-5 space-y-3">
            {statusChartData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No hay estados para mostrar.</p>
            ) : (
              statusChartData.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-brand-navy dark:text-brand-cream">{item.name}</span>
                    <span className="text-gray-500">{item.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-brand-teal/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${summary.total ? (item.value / summary.total) * 100 : 0}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden">
          <div className="p-5 border-b border-brand-teal/10">
            <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">Puntos calientes del mapa</h3>
            <p className="text-xs text-gray-400 mt-1">Agrupaciones detectadas en un radio de 5 km</p>
          </div>
          <div className="p-5 space-y-3">
            {topHotspots.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No hay concentraciones suficientes todavia.</p>
            ) : (
              topHotspots.map((item, index) => (
                <button
                  key={`${item.id}-${index}`}
                  onClick={() => onViewHotspot(item)}
                  className="w-full text-left rounded-2xl border border-brand-teal/10 bg-brand-cream dark:bg-brand-navy/30 p-4 hover:border-brand-teal/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Hotspot #{index + 1}</p>
                      <p className="font-semibold text-brand-navy dark:text-brand-cream mt-1">{item.label}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-brand-terracotta/10 text-brand-terracotta text-xs font-bold">
                      {item.count}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Zonas() {
  const { token } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showList, setShowList] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [flyTo, setFlyTo] = useState(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (catFilter) params.set("category", catFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", "1");
      params.set("per_page", "200");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [proposalsRes, reportsRes] = await Promise.all([
        fetch(`${API}/proposals?${params.toString()}`, { headers }),
        fetch(`${API}/denuncias?${params.toString()}`, { headers }),
      ]);

      const [proposalsData, reportsData] = await Promise.all([proposalsRes.json(), reportsRes.json()]);
      if (!proposalsRes.ok) throw new Error(proposalsData.error || "No se pudieron cargar las propuestas");
      if (!reportsRes.ok) throw new Error(reportsData.error || "No se pudieron cargar las denuncias");

      const merged = [
        ...(proposalsData.proposals ?? []).map((proposal) => ({ ...proposal, case_type: "propuesta" })),
        ...(reportsData.reports ?? []).map((report) => ({ ...report, case_type: "denuncia" })),
      ];

      setProposals(merged.filter((proposal) => proposal.latitude && proposal.longitude));
    } catch (err) {
      setError(err.message || "Error al cargar zonas");
    } finally {
      setLoading(false);
    }
  }, [catFilter, statusFilter, token]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const countByStatus = proposals.reduce((acc, proposal) => {
    acc[proposal.status] = (acc[proposal.status] ?? 0) + 1;
    return acc;
  }, {});

  const countByCategory = proposals.reduce((acc, proposal) => {
    acc[proposal.category] = (acc[proposal.category] ?? 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(
    proposals
      .filter((proposal) => proposal.location_text)
      .reduce((acc, proposal) => {
        const label = locationLabel(proposal);
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
      }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const hotspotCandidates = proposals.map((proposal) => {
    const nearby = proposals.filter((other) =>
      haversineKm(
        Number(proposal.latitude),
        Number(proposal.longitude),
        Number(other.latitude),
        Number(other.longitude)
      ) <= 5
    );

    const candidate = {
      id: proposal.id,
      label: locationLabel(proposal),
      center: [Number(proposal.latitude), Number(proposal.longitude)],
      count: nearby.length,
    };
    return candidate;
  }).sort((a, b) => b.count - a.count);

  const topHotspots = hotspotCandidates.reduce((acc, candidate) => {
    const alreadyCovered = acc.some((existing) =>
      haversineKm(candidate.center[0], candidate.center[1], existing.center[0], existing.center[1]) <= 3
    );
    if (!alreadyCovered) acc.push(candidate);
    return acc;
  }, []).slice(0, 5);

  const hotspot = topHotspots[0] ?? null;

  const categoryChartData = Object.entries(countByCategory)
    .map(([category, value]) => {
      const meta = categoryMeta(category);
      return { name: meta.label, value, color: meta.color };
    })
    .sort((a, b) => b.value - a.value);

  const statusChartData = Object.entries(countByStatus)
    .map(([status, value]) => {
      const meta = statusMeta(status);
      return { name: meta.label, value, color: meta.color };
    })
    .sort((a, b) => b.value - a.value);

  const summary = {
    total: proposals.length,
    uniqueLocations: new Set(proposals.filter((proposal) => proposal.location_text).map(locationLabel)).size,
    leadingZone: chartData[0] ?? null,
  };

  function focusProposal(proposal) {
    setSelectedId(proposal.id);
    setFlyTo([Number(proposal.latitude), Number(proposal.longitude)]);
    setShowList(false);
  }

  function focusHotspot(targetHotspot = hotspot) {
    if (targetHotspot) {
      setFlyTo(targetHotspot.center);
      setShowChart(false);
    }
  }

  return (
    <div className="bg-mesh min-h-screen text-gray-800 dark:text-gray-100 flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-[1000] card-soft shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20">
              <i className="fas fa-arrow-left text-sm"></i>
            </a>
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
              <i className="fas fa-map-marked-alt text-white text-sm"></i>
            </div>
            <div>
              <h1 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-none">Zonas de Incidencia</h1>
              <p className="text-xs text-gray-400">{proposals.length} casos geolocalizados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowList((value) => !value)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${showList ? "bg-brand-teal text-white border-brand-teal" : "border-brand-teal/20 text-brand-teal hover:bg-brand-teal/10"}`}>
              <i className="fas fa-list text-xs"></i>
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button onClick={() => setShowChart((value) => !value)} className={`xl:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${showChart ? "bg-brand-terracotta text-white border-brand-terracotta" : "border-brand-teal/20 text-brand-teal hover:bg-brand-teal/10"}`}>
              <i className="fas fa-chart-bar text-xs"></i>
              <span className="hidden sm:inline">Grafico</span>
            </button>
            <button onClick={fetchProposals} disabled={loading} className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20 disabled:opacity-40">
              <i className={`fas fa-sync-alt text-sm ${loading ? "fa-spin" : ""}`}></i>
            </button>
            <NavMenu currentPath="/zonas" />
          </div>
        </div>
      </header>

      <div className="fixed top-[65px] left-0 right-0 z-[999] card-soft border-b border-brand-teal/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 shrink-0">
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => setCatFilter(category.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
                  catFilter === category.value
                    ? "text-white border-transparent"
                    : "border-brand-teal/20 text-gray-500 hover:border-brand-teal/40 bg-white dark:bg-brand-navy/50"
                }`}
                style={catFilter === category.value ? { background: category.color, borderColor: category.color } : {}}
              >
                <i className={`fas ${category.icon} text-[10px]`}></i>
                {category.label}
                <span className={`text-[10px] font-bold px-1 rounded-full ml-0.5 ${catFilter === category.value ? "bg-white/30 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                  {category.value === "" ? proposals.length : (countByCategory[category.value] ?? 0)}
                </span>
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-brand-teal/20 shrink-0"></div>

          <div className="flex gap-1.5 shrink-0">
            {[
              { value: "", label: "Todos estados", color: "#6b7280" },
              { value: "recibida", label: "Recibidas", color: "#f59e0b" },
              { value: "en_gestion", label: "En gestion", color: "#3b82f6" },
              { value: "resuelta", label: "Resueltas", color: "#22c55e" },
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
                  statusFilter === status.value
                    ? "text-white border-transparent"
                    : "border-brand-teal/20 text-gray-500 bg-white dark:bg-brand-navy/50"
                }`}
                style={statusFilter === status.value ? { background: status.color, borderColor: status.color } : {}}
              >
                {status.label}
                {status.value && countByStatus[status.value] ? ` (${countByStatus[status.value]})` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 pt-[112px] h-screen">
        {showList && (
          <aside className="w-80 shrink-0 card-soft border-r border-brand-teal/10 overflow-y-auto scrollbar-hide z-[998]">
            <div className="p-4 border-b border-brand-teal/10">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {proposals.length} casos con GPS
              </p>
            </div>
            <div className="divide-y divide-brand-teal/5">
              {proposals.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No hay casos con coordenadas disponibles.
                </div>
              ) : (
                proposals.map((proposal) => {
                  const cat = categoryMeta(proposal.category);
                  const st = statusMeta(proposal.status);
                  return (
                    <button
                      key={proposal.id}
                      onClick={() => focusProposal(proposal)}
                      className={`w-full flex items-start gap-3 p-3 hover:bg-brand-teal/5 transition-colors text-left ${selectedId === proposal.id ? "bg-brand-teal/10 border-l-2 border-brand-teal" : ""}`}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${cat.color}22`, color: cat.color }}>
                        <i className={`fas ${cat.icon} text-sm`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-brand-navy dark:text-brand-cream leading-snug line-clamp-2">
                          {proposal.title}
                        </p>
                        {proposal.location_text && (
                          <p className="text-[10px] text-gray-400 mt-1 truncate">{proposal.location_text}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${proposal.case_type === "denuncia" ? "bg-brand-terracotta/10 text-brand-terracotta" : "bg-brand-teal/10 text-brand-teal"}`}>
                            {proposal.case_type === "denuncia" ? "Denuncia" : "Propuesta"}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${st.color}22`, color: st.color }}>
                            {st.label}
                          </span>
                          {proposal.votes_count > 0 && (
                            <span className="text-[10px] text-brand-terracotta">{proposal.votes_count} apoyos</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-[997] flex items-center justify-center bg-white/70 dark:bg-brand-navy/70 backdrop-blur-sm">
              <div className="text-center">
                <i className="fas fa-map-marked-alt text-brand-teal text-4xl animate-pulse mb-3"></i>
                <p className="text-brand-teal font-medium text-sm">Cargando incidencias...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[997] bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm shadow-lg">
              {error}
            </div>
          )}

          <div className="absolute top-4 right-4 z-[997] card-soft rounded-2xl p-3 shadow-soft border border-brand-teal/10 space-y-2 min-w-[180px]">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Resumen</p>
            {Object.entries(countByStatus).map(([status, count]) => {
              const st = statusMeta(status);
              return (
                <div key={status} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color }}></span>
                    <span className="text-xs text-gray-500">{st.label}</span>
                  </div>
                  <span className="text-xs font-bold text-brand-navy dark:text-brand-cream">{count}</span>
                </div>
              );
            })}
            <div className="pt-1 border-t border-brand-teal/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-xs font-bold text-brand-teal">{proposals.length}</span>
              </div>
            </div>
            {hotspot && (
              <div className="pt-2 border-t border-brand-teal/10">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Mayor incidencia 5 km</p>
                <p className="text-xs font-semibold text-brand-navy dark:text-brand-cream leading-tight">{hotspot.label}</p>
                <p className="text-[11px] text-brand-terracotta font-bold mt-1">
                  {hotspot.count} incidencia{hotspot.count === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>

          {proposals.length === 0 && !loading && (
            <div className="absolute inset-0 z-[996] flex items-center justify-center pointer-events-none">
              <div className="card-soft rounded-2xl p-8 text-center border border-brand-teal/10 shadow-soft max-w-xs mx-4">
                <i className="fas fa-map-marker-alt text-brand-teal/30 text-5xl mb-4"></i>
                <p className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream mb-1">Sin incidencias en el mapa</p>
                <p className="text-sm text-gray-400">Las propuestas y denuncias con ubicacion GPS apareceran aqui.</p>
              </div>
            </div>
          )}

          <MapContainer center={RD_CENTER} zoom={8} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {flyTo && <FlyTo position={flyTo} />}

            {proposals.map((proposal) => (
              <Marker
                key={proposal.id}
                position={[Number(proposal.latitude), Number(proposal.longitude)]}
                icon={createCustomIcon(proposal.category, proposal.status)}
                eventHandlers={{ click: () => setSelectedId(proposal.id) }}
              >
                <Popup maxWidth={270}>
                  <ProposalPopup proposal={proposal} />
                </Popup>
              </Marker>
            ))}

            {hotspot && (
              <Circle
                center={hotspot.center}
                radius={5000}
                pathOptions={{
                  color: "#c4714d",
                  fillColor: "#c4714d",
                  fillOpacity: 0.08,
                  weight: 2,
                  dashArray: "8 6",
                }}
              />
            )}

            {selectedId && (() => {
              const selected = proposals.find((proposal) => proposal.id === selectedId);
              if (!selected) return null;
              const cat = categoryMeta(selected.category);
              return (
                <Circle
                  center={[Number(selected.latitude), Number(selected.longitude)]}
                  radius={220}
                  pathOptions={{
                    color: cat.color,
                    fillColor: cat.color,
                    fillOpacity: 0.18,
                    weight: 2,
                  }}
                />
              );
            })()}
          </MapContainer>
        </div>

        <aside className="hidden xl:block w-[440px] shrink-0 p-4 overflow-y-auto scrollbar-hide">
          <ZonesChartPanel
            chartData={chartData}
            hotspot={hotspot}
            topHotspots={topHotspots}
            categoryChartData={categoryChartData}
            statusChartData={statusChartData}
            summary={summary}
            onViewHotspot={focusHotspot}
          />
        </aside>
      </div>

      {showChart && (
        <div
          className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center bg-brand-navy/60 backdrop-blur-sm p-4 xl:hidden"
          onClick={(e) => e.target === e.currentTarget && setShowChart(false)}
        >
          <div className="w-full max-w-3xl relative">
            <button onClick={() => setShowChart(false)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 bg-white/80 dark:bg-brand-navy/80 flex items-center justify-center text-gray-400 transition-colors">
              <i className="fas fa-times"></i>
            </button>
            <ZonesChartPanel
              chartData={chartData}
              hotspot={hotspot}
              topHotspots={topHotspots}
              categoryChartData={categoryChartData}
              statusChartData={statusChartData}
              summary={summary}
              onViewHotspot={focusHotspot}
            />
          </div>
        </div>
      )}
    </div>
  );
}
