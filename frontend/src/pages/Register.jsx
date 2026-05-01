import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_OPTIONS = [
  {
    value: "user",
    icon: "fa-user",
    title: "Ciudadano",
    desc: "Participa, comenta y propone.",
    active: "border-brand-teal bg-brand-teal/5",
    color: "border-brand-teal/30 hover:border-brand-teal",
    iconBg: "bg-brand-teal/10 text-brand-teal",
  },
  {
    value: "diputado",
    icon: "fa-star",
    title: "Diputado",
    desc: "Representante en la Camara de Diputados.",
    active: "border-amber-400 bg-amber-50 dark:bg-amber-900/10",
    color: "border-amber-400/30 hover:border-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-500",
  },
  {
    value: "presidente_junta",
    icon: "fa-home",
    title: "Presidente de Junta",
    desc: "Presidente de junta de vecinos.",
    active: "border-green-500 bg-green-50 dark:bg-green-900/10",
    color: "border-green-400/30 hover:border-green-400",
    iconBg: "bg-green-100 dark:bg-green-900/30 text-green-600",
  },
];

function PrivacyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-brand-navy rounded-2xl shadow-2xl border border-brand-teal/20 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-brand-teal/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-soft-xl">
              <i className="fas fa-shield-alt text-white text-sm"></i>
            </div>
            <h3 className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream">
              Politica de Privacidad y Consentimiento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        <div className="overflow-y-auto p-5 text-sm text-gray-600 dark:text-gray-300 space-y-4 flex-1">
          <div>
            <p className="font-semibold text-brand-navy dark:text-brand-cream mb-1">1. Datos que recopilamos</p>
            <p className="leading-relaxed opacity-80">
              Recopilamos tu nombre, correo electronico, comunidad principal y la informacion que ingreses voluntariamente
              para gestionar tu cuenta y ayudarte a participar en los espacios ciudadanos de tu zona.
            </p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy dark:text-brand-cream mb-1">2. Uso de la informacion</p>
            <p className="leading-relaxed opacity-80">
              Tu informacion se utiliza para brindarte acceso a los servicios del Portal Ciudadano, mostrarte foros
              comunitarios relevantes y mejorar la experiencia de uso.
            </p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy dark:text-brand-cream mb-1">3. Almacenamiento y seguridad</p>
            <p className="leading-relaxed opacity-80">
              Tus datos son almacenados con medidas de seguridad estandar de la industria. Puedes solicitar la
              eliminacion de tu cuenta y tus datos personales cuando lo necesites.
            </p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy dark:text-brand-cream mb-1">4. Tus derechos</p>
            <p className="leading-relaxed opacity-80">
              Tienes derecho a acceder, corregir o eliminar tu informacion personal. Tambien puedes retirar tu
              consentimiento en cualquier momento.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-brand-teal/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal font-semibold text-sm transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Register({ onSwitch }) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [community, setCommunity] = useState("");
  const [addressReference, setAddressReference] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [roleType, setRoleType] = useState("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const { register } = useAuth();
  const switchToLogin = () => {
    if (onSwitch) {
      onSwitch();
      return;
    }
    navigate("/login");
  };

  async function handleSubmit() {
    if (!fullName.trim()) return setError("El nombre completo es requerido");
    if (!username.trim()) return setError("El nombre de usuario es requerido");
    if (username.includes(" ")) return setError("El usuario no puede tener espacios");
    if (!email.trim()) return setError("El correo es requerido");
    if (!community.trim()) return setError("La comunidad principal es requerida");
    if (password.length < 6) return setError("La contrasena debe tener al menos 6 caracteres");

    if (!accepted) {
      setConsentError(true);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setConsentError(false);
    try {
      await register({
        email,
        password,
        username,
        full_name: fullName,
        community,
        address_reference: addressReference,
        requested_role: roleType,
      });

      if (roleType !== "user") {
        setSuccess(
          `Cuenta creada. Confirma tu correo y luego inicia sesion. Desde tu perfil podras completar tu solicitud como ${
            roleType === "diputado" ? "Diputado" : "Presidente de Junta"
          }.`
        );
      } else {
        setSuccess("Cuenta creada. Revisa tu correo para confirmar tu cuenta.");
      }
    } catch (err) {
      setError(err.message || "Error al registrarse");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card-soft rounded-3xl p-8 shadow-soft text-center border border-brand-teal/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-teal/10 flex items-center justify-center">
              <i className="fas fa-envelope text-brand-teal text-3xl"></i>
            </div>
            <h2 className="font-serif font-bold text-2xl text-brand-navy dark:text-brand-cream mb-3">
              Registro exitoso
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">{success}</p>
            <button
              onClick={switchToLogin}
              className="w-full py-3 btn-warm text-white font-semibold rounded-xl"
            >
              Ir al inicio de sesion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showModal && <PrivacyModal onClose={() => setShowModal(false)} />}

      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:text-brand-terracotta transition-colors"
            >
              <i className="fas fa-arrow-left text-xs"></i>
              Volver al inicio
            </Link>
          </div>
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl gradient-bg flex items-center justify-center shadow-soft">
              <i className="fas fa-landmark text-white text-2xl"></i>
            </div>
            <h1 className="font-serif font-bold text-2xl text-brand-navy dark:text-brand-cream">
              Portal Ciudadano
            </h1>
            <p className="text-gray-500 text-sm mt-1">Crea tu cuenta</p>
          </div>

          <div className="card-soft rounded-3xl shadow-soft border border-brand-teal/10 overflow-hidden">
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                  Nombre completo *
                </label>
                <div className="relative">
                  <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Juan Perez"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                  Nombre de usuario *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm font-medium">@</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    placeholder="tuusuario"
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                  Correo electronico *
                </label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@email.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                  Comunidad principal *
                </label>
                <div className="relative">
                  <i className="fas fa-map-marker-alt absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
                  <input
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    placeholder="Ej: Los Mina"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Este campo determina a que foros comunitarios tendras acceso.
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                  Calle, barrio o referencia
                </label>
                <div className="relative">
                  <i className="fas fa-road absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
                  <input
                    value={addressReference}
                    onChange={(e) => setAddressReference(e.target.value)}
                    placeholder="Ej: Calle Duarte, sector Vietnam"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                  Contrasena *
                </label>
                <div className="relative">
                  <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-teal transition-colors"
                  >
                    <i className={`fas ${showPass ? "fa-eye-slash" : "fa-eye"} text-sm`}></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide font-semibold block mb-2">
                  Tipo de cuenta
                </label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRoleType(opt.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        roleType === opt.value ? opt.active : `${opt.color} bg-transparent`
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${opt.iconBg}`}>
                        <i className={`fas ${opt.icon} text-sm`}></i>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream">{opt.title}</p>
                        <p className="text-xs text-gray-400 truncate">{opt.desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                        roleType === opt.value ? "border-brand-teal bg-brand-teal" : "border-gray-300"
                      }`}>
                        {roleType === opt.value && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </button>
                  ))}
                </div>
                {roleType !== "user" && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <i className="fas fa-info-circle mt-0.5 shrink-0"></i>
                    Despues de registrarte, completa tu solicitud de verificacion desde tu perfil.
                  </p>
                )}
              </div>

              <div className={`p-3.5 rounded-xl border transition-colors ${
                consentError
                  ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                  : accepted
                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                    : "bg-brand-cream dark:bg-brand-navy/30 border-brand-teal/20"
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => {
                        setAccepted(e.target.checked);
                        if (e.target.checked) setConsentError(false);
                      }}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      accepted
                        ? "bg-brand-teal border-brand-teal"
                        : consentError
                          ? "border-red-400 bg-white dark:bg-transparent"
                          : "border-brand-teal/40 bg-white dark:bg-transparent"
                    }`}>
                      {accepted && <i className="fas fa-check text-white text-xs"></i>}
                    </div>
                  </div>
                  <span className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    He leido y acepto la{" "}
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="text-brand-teal font-semibold hover:underline focus:outline-none"
                    >
                      Politica de Privacidad
                    </button>
                    {" "}y el tratamiento de mis datos personales.
                  </span>
                </label>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 btn-warm text-white font-semibold rounded-xl disabled:opacity-60"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </div>

            <div className="px-6 py-4 border-t border-brand-teal/10 bg-white/40 dark:bg-brand-navy/10 text-center">
              <p className="text-sm text-gray-500">
                Ya tienes cuenta?{" "}
                <button onClick={switchToLogin} className="text-brand-teal font-semibold hover:underline">
                  Inicia sesion
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
