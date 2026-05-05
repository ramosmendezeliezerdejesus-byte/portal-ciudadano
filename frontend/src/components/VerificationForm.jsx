import { useState, useRef } from "react";

const API = "http://localhost:5000/api";

const PROVINCES = [
  "Azua","Bahoruco","Barahona","Dajabón","Distrito Nacional","Duarte",
  "Elías Piña","El Seibo","Espaillat","Hato Mayor","Hermanas Mirabal",
  "Independencia","La Altagracia","La Romana","La Vega","María Trinidad Sánchez",
  "Monseñor Nouel","Monte Cristi","Monte Plata","Pedernales","Peravia",
  "Puerto Plata","Samaná","San Cristóbal","San José de Ocoa","San Juan",
  "San Pedro de Macorís","Sánchez Ramírez","Santiago","Santiago Rodríguez",
  "Santo Domingo","Valverde",
];

const ROLE_META = {
  diputado:         { label: "Diputado",            icon: "fa-star",  color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  presidente_junta: { label: "Presidente de Junta", icon: "fa-home",  color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" },
};

// ── VerificationBanner ────────────────────────────────────────────────────
export function VerificationBanner({ request, roleType, onStartForm }) {
  const requestedRole = ROLE_META[roleType] ? roleType : null;
  const [selectedRole, setSelectedRole] = useState(requestedRole || "diputado");

  // Solicitud pendiente
  if (request?.status === "pending") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 slide-in">
        <i className="fas fa-clock text-amber-500 text-lg mt-0.5 shrink-0"></i>
        <div>
          <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream">
            Solicitud pendiente de revisión
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            El administrador está revisando tu documentación. Recibirás una notificación cuando sea aprobada.
          </p>
        </div>
      </div>
    );
  }

  // Solicitud rechazada
  if (request?.status === "rejected") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 slide-in">
        <i className="fas fa-times-circle text-red-500 text-lg mt-0.5 shrink-0"></i>
        <div className="flex-1">
          <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream">Solicitud rechazada</p>
          {request.admin_notes && (
            <p className="text-xs text-gray-500 mt-0.5">Motivo: {request.admin_notes}</p>
          )}
          <button
            onClick={() => onStartForm(request?.requested_role || requestedRole || selectedRole)}
            className="inline-flex items-center gap-2 px-4 py-2 btn-warm text-white text-xs font-semibold rounded-xl mt-2"
          >
            <i className="fas fa-redo"></i> Enviar nueva solicitud
          </button>
        </div>
      </div>
    );
  }

  // Sin solicitud — mostrar opción para solicitar verificación
  return (
    <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft p-4 slide-in">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
          <i className="fas fa-id-card text-brand-teal text-sm"></i>
        </div>
        <div>
          <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream">
            {requestedRole
              ? `Confirma que eres ${ROLE_META[requestedRole].label}`
              : "Eres Diputado o Presidente de Junta?"}
          </p>
          <p className="text-xs text-gray-400">Solicita verificación de tu cargo oficial</p>
        </div>
      </div>

      {!requestedRole && <div className="flex gap-2 mb-3">
        {Object.entries(ROLE_META).map(([value, meta]) => (
          <button
            key={value}
            onClick={() => setSelectedRole(value)}
            className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm transition-all ${
              selectedRole === value
                ? value === "diputado"
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-900/10"
                  : "border-green-500 bg-green-50 dark:bg-green-900/10"
                : "border-brand-teal/20 hover:border-brand-teal/40"
            }`}
          >
            <i className={`fas ${meta.icon} text-xs ${selectedRole === value ? meta.color : "text-gray-400"}`}></i>
            <span className={`font-medium text-xs ${selectedRole === value ? "text-brand-navy dark:text-brand-cream" : "text-gray-400"}`}>
              {meta.label}
            </span>
          </button>
        ))}
      </div>}

      <button
        onClick={() => onStartForm(selectedRole)}
        className="w-full flex items-center justify-center gap-2 py-2.5 btn-warm text-white text-sm font-semibold rounded-xl"
      >
        <i className="fas fa-paper-plane"></i>
        Solicitar verificación como {ROLE_META[selectedRole].label}
      </button>
    </div>
  );
}

// ── VerificationForm: formulario completo ─────────────────────────────────
export function VerificationForm({ roleType, onSuccess, onCancel }) {
  const [province,      setProvince]      = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [latitude,      setLatitude]      = useState(null);
  const [longitude,     setLongitude]     = useState(null);
  const [locLoading,    setLocLoading]    = useState(false);
  const [locError,      setLocError]      = useState("");
  const [proofFile,     setProofFile]     = useState(null);
  const [proofName,     setProofName]     = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const proofRef = useRef(null);

  const meta = ROLE_META[roleType] ?? ROLE_META.diputado;

  function getLocation() {
    if (!navigator.geolocation) { setLocError("Tu navegador no soporta geolocalización"); return; }
    setLocLoading(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocLoading(false);
      },
      () => {
        setLocError("No se pudo obtener la ubicación. Puedes continuar sin ella.");
        setLocLoading(false);
      },
      { timeout: 10000 }
    );
  }

  function handleProofSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setError("Solo se permiten PDF, JPG, PNG o WebP"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("El archivo no puede superar 10MB"); return; }
    setError("");
    setProofFile(file);
    setProofName(file.name);
  }

  async function handleSubmit() {
    if (!province)   return setError("Selecciona tu provincia");
    if (!proofFile)  return setError("Debes adjuntar un documento de prueba");

    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("pc_token");

      // 1. Subir archivo
      const fd = new FormData();
      fd.append("proof", proofFile);
      const uploadRes  = await fetch(`${API}/upload/proof`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Error al subir el archivo");

      // 2. Enviar solicitud
      const reqRes  = await fetch(`${API}/verification/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requested_role:  roleType,
          province,
          office_address:  officeAddress || null,
          latitude:        latitude  ? parseFloat(latitude)  : null,
          longitude:       longitude ? parseFloat(longitude) : null,
          proof_file_url:  uploadData.url,
          proof_file_path: uploadData.path,
        }),
      });
      const reqData = await reqRes.json();
      if (!reqRes.ok) throw new Error(reqData.error || "Error al enviar la solicitud");

      onSuccess();
    } catch (err) {
      setError(err.message || "Error al enviar la solicitud");
    }
    setLoading(false);
  }

  return (
    <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft p-5 slide-in space-y-4">

      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          roleType === "diputado" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-500" : "bg-green-100 dark:bg-green-900/30 text-green-600"
        }`}>
          <i className={`fas ${meta.icon} text-sm`}></i>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-brand-navy dark:text-brand-cream">
            Solicitud de verificación — {meta.label}
          </h3>
          <p className="text-xs text-gray-400">Completa los datos para enviar tu solicitud</p>
        </div>
      </div>

      {/* Provincia */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
          {roleType === "diputado" ? "Provincia que representa *" : "Provincia de la junta *"}
        </label>
        <div className="relative">
          <i className="fas fa-map-marker-alt absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-terracotta/60 text-sm pointer-events-none"></i>
          <select
            value={province}
            onChange={e => setProvince(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all appearance-none"
          >
            <option value="">Selecciona una provincia...</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
          {roleType === "diputado" ? "Dirección de la casa de diputados" : "Dirección de la junta"}
          <span className="text-gray-300 font-normal ml-1">(opcional)</span>
        </label>
        <div className="relative">
          <i className="fas fa-building absolute left-3.5 top-3.5 text-brand-teal/60 text-sm"></i>
          <textarea
            value={officeAddress}
            onChange={e => setOfficeAddress(e.target.value)}
            placeholder="Ej: Av. México, Congreso Nacional, Santo Domingo"
            rows={2}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all resize-none"
          />
        </div>
      </div>

      {/* GPS */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
          Ubicación exacta <span className="text-gray-300 font-normal">(opcional)</span>
        </label>
        <button
          type="button"
          onClick={getLocation}
          disabled={locLoading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-teal/30 hover:border-brand-teal hover:bg-brand-teal/5 text-brand-teal text-sm font-medium transition-all disabled:opacity-50"
        >
          {locLoading ? (
            <><i className="fas fa-spinner fa-spin"></i> Obteniendo ubicación...</>
          ) : latitude ? (
            <><i className="fas fa-check-circle text-green-500"></i> <span className="text-green-600 dark:text-green-400">Ubicación obtenida</span></>
          ) : (
            <><i className="fas fa-crosshairs"></i> Usar mi ubicación actual</>
          )}
        </button>
        {locError && <p className="mt-1 text-xs text-amber-500"><i className="fas fa-exclamation-triangle text-[10px] mr-1"></i>{locError}</p>}
      </div>

      {/* Documento */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
          Documento de prueba * <span className="text-gray-300 font-normal">(PDF, JPG, PNG · máx 10MB)</span>
        </label>
        <div
          onClick={() => proofRef.current?.click()}
          className={`w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            proofFile ? "border-green-400 bg-green-50 dark:bg-green-900/10" : "border-brand-teal/30 hover:border-brand-teal hover:bg-brand-teal/5"
          }`}
        >
          <i className={`fas ${proofFile ? "fa-file-check text-green-500" : "fa-file-upload text-brand-teal/50"} text-2xl`}></i>
          {proofFile ? (
            <p className="text-sm font-medium text-green-600 dark:text-green-400 px-4 text-center truncate max-w-xs">{proofName}</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">Haz clic para subir tu documento</p>
              <p className="text-xs text-gray-400">Certificado, credencial o resolución oficial</p>
            </>
          )}
        </div>
        <input ref={proofRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleProofSelect} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <i className="fas fa-exclamation-circle shrink-0"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Aviso */}
      <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <i className="fas fa-shield-alt text-blue-500 mt-0.5 shrink-0 text-sm"></i>
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          El administrador revisará tu documentación y recibirás una notificación cuando sea aprobada o rechazada.
        </p>
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-brand-teal/30 text-brand-teal font-semibold text-sm hover:bg-brand-teal/5 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-3 btn-warm text-white font-semibold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><i className="fas fa-spinner fa-spin"></i> Enviando...</> : <><i className="fas fa-paper-plane"></i> Enviar solicitud</>}
        </button>
      </div>
    </div>
  );
}
