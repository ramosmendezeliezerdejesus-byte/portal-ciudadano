import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:5000/api";

export default function Login({ onSwitch }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handle = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  const switchToRegister = () => {
    if (onSwitch) {
      onSwitch();
      return;
    }
    navigate("/registro");
  };

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotVerified(false);
    setResendSuccess(false);
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      if (err.message === "EMAIL_NOT_CONFIRMED") {
        setNotVerified(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendEmail() {
    setResendLoading(true);
    try {
      await fetch(`${API}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      setResendSuccess(true);
    } catch (_) {}
    setResendLoading(false);
  }

  return (
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

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-bg flex items-center justify-center shadow-soft-xl">
            <i className="fas fa-landmark text-white text-2xl"></i>
          </div>
          <h1 className="font-serif font-bold text-3xl gradient-text">Portal Ciudadano</h1>
          <p className="text-gray-500 mt-1 text-sm">Donde la ciudadania habla</p>
        </div>

        <div className="card-soft rounded-2xl shadow-soft-xl p-8 border border-brand-teal/10 slide-in">
          <h2 className="font-serif font-bold text-2xl text-brand-navy dark:text-brand-cream mb-6">
            Iniciar sesion
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
              <i className="fas fa-exclamation-circle shrink-0"></i>
              {error}
            </div>
          )}

          {notVerified && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
              <div className="flex items-start gap-2 mb-3">
                <i className="fas fa-envelope-open-text text-lg shrink-0 mt-0.5"></i>
                <div>
                  <p className="font-semibold">Verifica tu correo electronico</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Te enviamos un correo a <strong>{form.email}</strong>. Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
                  </p>
                </div>
              </div>
              {resendSuccess ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-medium">
                  <i className="fas fa-check-circle"></i>
                  Correo reenviado. Revisa tu bandeja de entrada.
                </div>
              ) : (
                <button
                  onClick={resendEmail}
                  disabled={resendLoading}
                  className="w-full py-2 rounded-lg bg-amber-100 dark:bg-amber-800/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-800 dark:text-amber-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resendLoading
                    ? <><i className="fas fa-spinner fa-spin"></i> Enviando...</>
                    : <><i className="fas fa-paper-plane"></i> Reenviar correo de verificacion</>
                  }
                </button>
              )}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-navy dark:text-brand-cream mb-1.5">
                Correo electronico
              </label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handle}
                  placeholder="tu@correo.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-navy dark:text-brand-cream mb-1.5">
                Contrasena
              </label>
              <div className="relative">
                <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60 text-sm"></i>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handle}
                  placeholder="********"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 btn-primary text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <><i className="fas fa-spinner fa-spin"></i> Ingresando...</>
                : <><i className="fas fa-sign-in-alt"></i> Ingresar</>
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              No tienes cuenta?{" "}
              <button onClick={switchToRegister} className="text-brand-terracotta font-semibold hover:underline">
                Registrate aqui
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
