export const TOPIC_OPTIONS = [
  { value: "servicios_publicos", label: "Servicios publicos" },
  { value: "infraestructura", label: "Infraestructura" },
  { value: "seguridad", label: "Seguridad" },
  { value: "ambiente", label: "Medio ambiente" },
  { value: "educacion", label: "Educacion" },
  { value: "salud", label: "Salud" },
  { value: "transporte", label: "Transporte" },
  { value: "participacion", label: "Participacion ciudadana" },
  { value: "emergencias", label: "Emergencias" },
  { value: "limpieza", label: "Limpieza" },
];

export function topicLabel(topicKey) {
  return TOPIC_OPTIONS.find((item) => item.value === topicKey)?.label ?? "Tema general";
}
