// src/components/RoleBadge.jsx
// Uso: <RoleBadge role={profile.role} verified={profile.verified} />

export default function RoleBadge({ role, verified }) {
  if (role === "super_admin") {
    return (
      <span title="Administrador del Portal">
        <i className="fas fa-shield-alt text-gray-900 dark:text-white text-sm drop-shadow"></i>
      </span>
    );
  }
  if (role === "diputado") {
    return (
      <span title="Diputado verificado">
        <i className="fas fa-star text-amber-400 text-sm drop-shadow"></i>
      </span>
    );
  }
  if (role === "presidente_junta") {
    return (
      <span title="Presidente de Junta de Vecinos verificado">
        <i className="fas fa-home text-green-500 text-sm drop-shadow"></i>
      </span>
    );
  }
  if (verified || role === "verified") {
    return (
      <span title="Usuario verificado">
        <i className="fas fa-check-circle text-brand-teal text-sm"></i>
      </span>
    );
  }
  return null;
}