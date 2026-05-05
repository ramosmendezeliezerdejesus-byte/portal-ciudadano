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

const PDF = {
  teal: [99, 189, 181],
  tealDark: [21, 105, 111],
  navy: [43, 43, 43],
  cream: [238, 242, 240],
  muted: [107, 114, 128],
  line: [214, 234, 231],
  white: [255, 255, 255],
  amber: [245, 158, 11],
  red: [220, 38, 38],
  green: [22, 163, 74],
  blue: [37, 99, 235],
};

function setFill(pdf, color) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function setDraw(pdf, color) {
  pdf.setDrawColor(color[0], color[1], color[2]);
}

function setText(pdf, color) {
  pdf.setTextColor(color[0], color[1], color[2]);
}

function cleanText(value, fallback = "Sin datos") {
  return String(value ?? fallback).trim() || fallback;
}

function ellipsize(value, maxLength = 34) {
  const text = cleanText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function formatPdfDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function statusMeta(status) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "resuelta") return { label: "Resuelta", color: PDF.green, bg: [231, 247, 237] };
  if (normalized === "en_gestion") return { label: "En gestion", color: PDF.blue, bg: [232, 240, 255] };
  return { label: "Recibida", color: PDF.amber, bg: [255, 247, 237] };
}

function drawPill(pdf, text, x, y, color, bg, width = 34) {
  setFill(pdf, bg);
  pdf.roundedRect(x, y, width, 7.5, 3.75, 3.75, "F");
  setText(pdf, color);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text(text, x + width / 2, y + 5, { align: "center" });
}

function drawPdfHeader(pdf, title, subtitle, meta) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  setFill(pdf, PDF.cream);
  pdf.rect(0, 0, pageWidth, 34, "F");
  setFill(pdf, PDF.tealDark);
  pdf.rect(0, 0, pageWidth, 3, "F");
  setFill(pdf, PDF.teal);
  pdf.roundedRect(14, 10, 14, 14, 4, 4, "F");
  setText(pdf, PDF.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("PC", 21, 19, { align: "center" });
  setText(pdf, PDF.navy);
  pdf.setFont("times", "bold");
  pdf.setFontSize(18);
  pdf.text(pdf.splitTextToSize(title, 104).slice(0, 1), 34, 16);
  setText(pdf, PDF.muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(pdf.splitTextToSize(subtitle, 118).slice(0, 1), 34, 23);
  setText(pdf, PDF.tealDark);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text(pdf.splitTextToSize(meta, 42).slice(0, 2), pageWidth - 14, 15, { align: "right" });
}

function drawPdfFooter(pdf) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    setDraw(pdf, PDF.line);
    pdf.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    setText(pdf, PDF.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Portal Ciudadano - Donde la ciudadania habla", 14, pageHeight - 8);
    pdf.text(`Pagina ${page} de ${pages}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  }
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
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const generatedAt = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
    const selectedCommunity = communities.find((community) => community.value === communityKey)?.label ?? "Todos los sectores";

    const ensurePage = (y, needed = 24) => {
      if (y + needed <= pageHeight - 22) return y;
      pdf.addPage();
      drawPdfHeader(pdf, "Reporte comunitario", selectedCommunity, generatedAt);
      return 46;
    };

    const sectionTitle = (title, y) => {
      y = ensurePage(y, 14);
      setText(pdf, PDF.navy);
      pdf.setFont("times", "bold");
      pdf.setFontSize(15);
      pdf.text(title, margin, y);
      setDraw(pdf, PDF.teal);
      pdf.setLineWidth(0.8);
      pdf.line(margin, y + 3, margin + 32, y + 3);
      return y + 11;
    };

    const metricCard = (label, value, x, y, w, color) => {
      setFill(pdf, PDF.white);
      setDraw(pdf, PDF.line);
      pdf.roundedRect(x, y, w, 30, 4, 4, "FD");
      setFill(pdf, color);
      pdf.roundedRect(x + 4, y + 6, 8, 18, 3, 3, "F");
      setText(pdf, PDF.muted);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(pdf.splitTextToSize(label.toUpperCase(), w - 21).slice(0, 2), x + 16, y + 10);
      setText(pdf, PDF.navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);
      pdf.text(String(value ?? 0), x + 16, y + 24);
    };

    const rankingBox = (title, items, x, y, w) => {
      setFill(pdf, PDF.white);
      setDraw(pdf, PDF.line);
      pdf.roundedRect(x, y, w, 62, 4, 4, "FD");
      setText(pdf, PDF.navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(title, x + 5, y + 8);
      const total = Math.max(...items.slice(0, 5).map((item) => item.count), 1);
      if (!items.length) {
        setText(pdf, PDF.muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text("Sin datos registrados.", x + 5, y + 20);
        return;
      }
      items.slice(0, 5).forEach((item, index) => {
        const rowY = y + 18 + index * 8;
        const labelW = 37;
        const barX = x + labelW + 8;
        const barW = w - labelW - 18;
        const barWidth = Math.max(5, (barW * item.count) / total);
        setText(pdf, PDF.navy);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text(ellipsize(item.label, 28), x + 5, rowY, { maxWidth: labelW });
        setFill(pdf, [230, 246, 244]);
        pdf.roundedRect(barX, rowY - 3.2, barW, 3.5, 1.7, 1.7, "F");
        setFill(pdf, index === 0 ? PDF.tealDark : PDF.teal);
        pdf.roundedRect(barX, rowY - 3.2, barWidth, 3.5, 1.7, 1.7, "F");
        setText(pdf, PDF.tealDark);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text(String(item.count), x + w - 4, rowY, { align: "right" });
      });
    };

    drawPdfHeader(pdf, "Reporte comunitario", "Resumen ejecutivo de solicitudes, denuncias y sectores", generatedAt);

    let y = 47;
    setText(pdf, PDF.navy);
    pdf.setFont("times", "bold");
    pdf.setFontSize(22);
    pdf.text(pdf.splitTextToSize("Panel de actividad comunitaria", contentWidth).slice(0, 2), margin, y);
    y += 9;
    setText(pdf, PDF.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(`Sector: ${selectedCommunity}`, 112).slice(0, 2), margin, y);
    pdf.text(`Generado: ${generatedAt}`, pageWidth - margin, y, { align: "right" });
    y += selectedCommunity.length > 48 ? 13 : 9;
    const intro = "Este reporte consolida los casos ciudadanos registrados, los problemas mas frecuentes y los sectores con mayor actividad para apoyar la toma de decisiones.";
    pdf.text(pdf.splitTextToSize(intro, contentWidth), margin, y);
    y += 17;

    const cardGap = 6;
    const cardW = (contentWidth - cardGap) / 2;
    metricCard("Solicitudes registradas", summary.total_requests, margin, y, cardW, PDF.teal);
    metricCard("Problemas distintos", summary.common_problems.length, margin + cardW + cardGap, y, cardW, PDF.red);
    y += 36;
    metricCard("Sectores reportados", summary.sectors_with_more_reports.length, margin, y, cardW, PDF.amber);
    metricCard("Usuarios por sector", summary.users_by_sector.length, margin + cardW + cardGap, y, cardW, PDF.blue);
    y += 44;

    y = sectionTitle("Indicadores principales", y);
    const boxW = (contentWidth - cardGap) / 2;
    rankingBox("Problemas mas comunes", summary.common_problems, margin, y, boxW);
    rankingBox("Sectores con mas reportes", summary.sectors_with_more_reports, margin + boxW + cardGap, y, boxW);
    y += 73;

    y = sectionTitle("Detalle de casos reportados", y);
    if (!requests.length) {
      setFill(pdf, PDF.white);
      setDraw(pdf, PDF.line);
      pdf.roundedRect(margin, y, contentWidth, 24, 4, 4, "FD");
      setText(pdf, PDF.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("No hay solicitudes o denuncias registradas para este filtro.", margin + 6, y + 14);
    }

    requests.forEach((item, index) => {
      const title = cleanText(item.title);
      const description = cleanText(item.description, "Sin descripcion");
      const metaLine = `${cleanText(item.source_type)} | ${cleanText(item.category)} | ${cleanText(item.community)} | ${formatPdfDate(item.created_at)}`;
      const titleLines = pdf.splitTextToSize(title, contentWidth - 76).slice(0, 2);
      const metaLines = pdf.splitTextToSize(metaLine, contentWidth - 32).slice(0, 2);
      const descLines = pdf.splitTextToSize(description, contentWidth - 16).slice(0, 4);
      const footerText = `${cleanText(item.reporter_name, "Usuario")}${item.location_text ? ` - ${item.location_text}` : ""}`;
      const footerLines = pdf.splitTextToSize(footerText, contentWidth - 16).slice(0, 2);
      const titleBlockH = titleLines.length * 5;
      const metaBlockH = metaLines.length * 4;
      const descBlockH = descLines.length * 4.4;
      const footerBlockH = item.reporter_name || item.location_text ? footerLines.length * 3.8 + 3 : 0;
      const cardHeight = Math.max(48, 18 + titleBlockH + metaBlockH + descBlockH + footerBlockH);
      y = ensurePage(y, cardHeight + 7);

      setFill(pdf, PDF.white);
      setDraw(pdf, PDF.line);
      pdf.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, "FD");

      setFill(pdf, PDF.teal);
      pdf.circle(margin + 8, y + 9, 4.5, "F");
      setText(pdf, PDF.white);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(String(index + 1), margin + 8, y + 11, { align: "center" });

      setText(pdf, PDF.navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10.5);
      pdf.text(titleLines, margin + 16, y + 8);

      const meta = statusMeta(item.status);
      drawPill(pdf, meta.label, pageWidth - margin - 38, y + 5, meta.color, meta.bg, 34);

      setText(pdf, PDF.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      const metaY = y + 10 + titleBlockH;
      pdf.text(metaLines, margin + 16, metaY);

      const descY = metaY + metaBlockH + 6;
      setText(pdf, PDF.navy);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.2);
      pdf.text(descLines, margin + 8, descY);

      if (item.reporter_name || item.location_text) {
        setText(pdf, PDF.tealDark);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text(footerLines, margin + 8, y + cardHeight - 8 - (footerLines.length - 1) * 3.8);
      }
      y += cardHeight + 6;
    });

    drawPdfFooter(pdf);
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
