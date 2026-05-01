import { useMemo, useState } from "react";
import { TOPIC_OPTIONS } from "../utils/topics";

export default function InterestOnboardingModal({ user, onSave, saving, error }) {
  const initialTopics = useMemo(
    () => Array.isArray(user?.notification_topics) ? user.notification_topics : [],
    [user?.notification_topics],
  );
  const [selectedTopics, setSelectedTopics] = useState(initialTopics);
  const [zoneEnabled, setZoneEnabled] = useState(user?.notification_zone_enabled !== false);

  function toggleTopic(topicKey) {
    setSelectedTopics((prev) => (
      prev.includes(topicKey)
        ? prev.filter((value) => value !== topicKey)
        : [...prev, topicKey]
    ));
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-brand-teal/20 bg-white shadow-2xl dark:bg-brand-navy">
        <div className="border-b border-brand-teal/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-teal">Tus intereses</p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-brand-navy dark:text-brand-cream">
            Elige los temas de los que quieres recibir avisos
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
            Te notificaremos cuando haya denuncias, propuestas, servicios, reuniones o campanas relacionadas con estos temas en tu zona.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TOPIC_OPTIONS.map((topic) => {
              const selected = selectedTopics.includes(topic.value);
              return (
                <button
                  key={topic.value}
                  type="button"
                  onClick={() => toggleTopic(topic.value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                    selected
                      ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                      : "border-brand-teal/20 bg-brand-cream text-brand-navy hover:border-brand-teal/40 dark:bg-brand-navy/30 dark:text-brand-cream"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{topic.label}</span>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${selected ? "border-brand-teal bg-brand-teal text-white" : "border-gray-300 text-gray-300"}`}>
                      <i className="fas fa-check"></i>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-brand-teal/20 bg-brand-cream p-4 dark:bg-brand-navy/30">
            <input
              type="checkbox"
              checked={zoneEnabled}
              onChange={(event) => setZoneEnabled(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-brand-teal/30 text-brand-teal focus:ring-brand-teal"
            />
            <div>
              <p className="font-semibold text-brand-navy dark:text-brand-cream">Limitar notificaciones a mi zona</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">
                Usaremos tu comunidad actual para enviarte avisos solo del sector que te corresponde.
              </p>
            </div>
          </label>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-brand-teal/10 p-6">
          <button
            type="button"
            onClick={() => onSave({ selectedTopics, zoneEnabled })}
            disabled={saving || selectedTopics.length === 0}
            className="w-full rounded-2xl btn-warm py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar intereses"}
          </button>
        </div>
      </div>
    </div>
  );
}
