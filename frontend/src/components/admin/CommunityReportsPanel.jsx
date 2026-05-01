import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function summaryCard(label, value, icon, tone = "teal") {
  const tones = {
    teal: "bg-brand-teal/10 text-brand-teal",
    orange: "bg-brand-terracotta/10 text-brand-terracotta",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  };

  return (
    <div className="rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-soft dark:bg-brand-navy/30" key={label}>
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone] ?? tones.teal}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-brand-navy dark:text-brand-cream">{value}</p>
    </div>
  );
}

export default function CommunityReportsPanel({ onClose }) {
  const { adminGetCommunityReportSummary } = useAuth();
  const [communityKey, setCommunityKey] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminGetCommunityReportSummary(communityKey);
      setReportData(data);
    } catch (err) {
      setError(err.message || "No se pudo cargar el reporte comunitario");
    }
    setLoading(false);
  }, [adminGetCommunityReportSummary, communityKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const requests = reportData?.requests ?? [];
  const summary = reportData?.summary ?? {
    total_requests: 0,
    by_source: [],
    common_problems: [],
    sectors_with_more_reports: [],
    users_by_sector: [],
  };
  const communities = reportData?.communities ?? [];

  const excelRows = useMemo(() => (
    requests.map((item) => ({
      Tipo: item.source_type,
      Titulo: item.title,
      Descripcion: item.description,
      Categoria: item.category,
      Estado: item.status,
      Sector: item.community,
      ReportadoPor: item.reporter_name,
      Ubicacion: item.location_text,
      Fecha: item.created_at,
    }))
  ), [requests]);

  function handleExportCsv() {
    const rows = [
      ["Tipo", "Titulo", "Descripcion", "Categoria", "Estado", "Sector", "ReportadoPor", "Ubicacion", "Fecha"],
      ...excelRows.map((row) => Object.values(row)),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");
    downloadBlob(csv, "reporte-comunitario.csv", "text/csv;charset=utf-8;");
  }

  function handleExportExcel() {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitudes");
    XLSX.writeFile(workbook, "reporte-comunitario.xlsx");
  }

  function handleExportPdf() {
    const pdf = new jsPDF();
    let y = 20;

    pdf.setFontSize(18);
    pdf.text("Reporte comunitario", 14, y);
    y += 12;

    pdf.setFontSize(11);
    pdf.text(`Solicitudes registradas: ${summary.total_requests}`, 14, y);
    y += 8;

    const topProblems = summary.common_problems.slice(0, 5).map((item) => `${item.label}: ${item.count}`).join(" | ");
    const topSectors = summary.sectors_with_more_reports.slice(0, 5).map((item) => `${item.label}: ${item.count}`).join(" | ");
    pdf.text(`Problemas mas comunes: ${topProblems || "Sin datos"}`, 14, y, { maxWidth: 180 });
    y += 14;
    pdf.text(`Sectores con mas reportes: ${topSectors || "Sin datos"}`, 14, y, { maxWidth: 180 });
    y += 14;

    pdf.setFontSize(10);
    requests.slice(0, 10).forEach((item, index) => {
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(`${index + 1}. [${item.source_type}] ${item.title}`, 14, y, { maxWidth: 180 });
      y += 6;
      pdf.text(`Categoria: ${item.category} | Sector: ${item.community} | Estado: ${item.status}`, 18, y, { maxWidth: 176 });
      y += 8;
    });

    pdf.save("reporte-comunitario.pdf");
  }

  return (
    <section className="card-soft overflow-hidden rounded-2xl border border-brand-teal/10 shadow-soft slide-in">
      <div className="border-b border-brand-teal/10 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-brand-navy dark:text-brand-cream">
              Exportacion de reportes comunitarios
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Consulta cuantas solicitudes se han hecho, los problemas mas comunes y los sectores con mas reportes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={communityKey}
              onChange={(event) => setCommunityKey(event.target.value)}
              className="rounded-xl border border-brand-teal/20 bg-brand-cream px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal dark:bg-brand-navy/30"
            >
              <option value="">Todos los sectores</option>
              {communities.map((community) => (
                <option key={community.value} value={community.value}>{community.label}</option>
              ))}
            </select>
            <button onClick={loadData} className="rounded-xl border border-brand-teal/20 px-4 py-2.5 text-sm font-semibold text-brand-teal hover:bg-brand-teal/10">
              <i className="fas fa-rotate mr-2"></i>Actualizar
            </button>
            <button onClick={onClose} className="rounded-xl border border-brand-teal/20 px-4 py-2.5 text-sm text-gray-500 hover:text-brand-navy dark:hover:text-brand-cream">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCard("Solicitudes", summary.total_requests, "fa-file-circle-check", "teal")}
          {summaryCard("Problemas distintos", summary.common_problems.length, "fa-triangle-exclamation", "orange")}
          {summaryCard("Sectores reportados", summary.sectors_with_more_reports.length, "fa-map-marked-alt", "amber")}
          {summaryCard("Usuarios por sector", summary.users_by_sector.length, "fa-users", "blue")}
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportPdf} disabled={loading || requests.length === 0} className="rounded-xl btn-warm px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <i className="fas fa-file-pdf mr-2"></i>Descargar PDF
          </button>
          <button onClick={handleExportExcel} disabled={loading || requests.length === 0} className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <i className="fas fa-file-excel mr-2"></i>Descargar Excel
          </button>
          <button onClick={handleExportCsv} disabled={loading || requests.length === 0} className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <i className="fas fa-file-csv mr-2"></i>Descargar CSV
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-brand-teal/10 p-10 text-center text-sm text-gray-500">
            Generando resumen comunitario...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-brand-teal/10 p-4">
                <h4 className="mb-3 font-semibold text-brand-navy dark:text-brand-cream">Problemas mas comunes</h4>
                <div className="space-y-2">
                  {summary.common_problems.slice(0, 8).map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl bg-brand-cream/80 px-3 py-2 text-sm dark:bg-brand-navy/30">
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-teal/10 p-4">
                <h4 className="mb-3 font-semibold text-brand-navy dark:text-brand-cream">Sectores con mas reportes</h4>
                <div className="space-y-2">
                  {summary.sectors_with_more_reports.slice(0, 8).map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl bg-brand-cream/80 px-3 py-2 text-sm dark:bg-brand-navy/30">
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-teal/10 p-4">
                <h4 className="mb-3 font-semibold text-brand-navy dark:text-brand-cream">Usuarios por sector</h4>
                <div className="space-y-2">
                  {summary.users_by_sector.slice(0, 8).map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl bg-brand-cream/80 px-3 py-2 text-sm dark:bg-brand-navy/30">
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-brand-teal/10">
              <div className="border-b border-brand-teal/10 px-4 py-3">
                <h4 className="font-semibold text-brand-navy dark:text-brand-cream">Solicitudes y problemas reportados</h4>
              </div>
              <div className="max-h-[420px] overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-brand-navy">
                    <tr className="border-b border-brand-teal/10 text-gray-500">
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Titulo</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Sector</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((item) => (
                      <tr key={`${item.source_type}-${item.id}`} className="border-b border-brand-teal/10">
                        <td className="px-4 py-3 capitalize">{item.source_type}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-brand-navy dark:text-brand-cream">{item.title}</div>
                          <div className="text-xs text-gray-400">{item.reporter_name}</div>
                        </td>
                        <td className="px-4 py-3">{item.category}</td>
                        <td className="px-4 py-3">{item.community}</td>
                        <td className="px-4 py-3">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
