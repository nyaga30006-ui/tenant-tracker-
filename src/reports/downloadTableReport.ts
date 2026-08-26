import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

export interface ReportSummaryItem {
  label: string;
  value: string;
}

export interface TableReportDefinition {
  columns: string[];
  filename: string;
  filters?: string[];
  propertyAddress?: string;
  propertyName: string;
  rows: Array<Array<string | number>>;
  summary?: ReportSummaryItem[];
  title: string;
}

function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function nairobiDay(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "Africa/Nairobi", year: "numeric" }).format(value);
}

export function reportMoney(value: number): string {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

export function reportDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-KE", { day: "2-digit", month: "short", timeZone: "UTC", year: "numeric" });
}

export function downloadTableReport(definition: TableReportDefinition): string {
  const doc = new jsPDF({ format: "a4", orientation: definition.columns.length > 7 ? "landscape" : "portrait", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date();

  doc.setFillColor(31, 45, 61);
  doc.rect(0, 0, pageWidth, 31, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(definition.title, 14, 13);
  doc.setFontSize(10);
  doc.text(definition.propertyName, 14, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated ${generatedAt.toLocaleString("en-KE")}`, pageWidth - 14, 13, { align: "right" });
  if (definition.propertyAddress) doc.text(definition.propertyAddress, pageWidth - 14, 21, { align: "right" });

  let startY = 38;
  if (definition.summary?.length) {
    const usableWidth = pageWidth - 28;
    const gap = 3;
    const cardWidth = (usableWidth - gap * (definition.summary.length - 1)) / definition.summary.length;
    definition.summary.forEach((item, index) => {
      const x = 14 + index * (cardWidth + gap);
      doc.setFillColor(238, 241, 233);
      doc.roundedRect(x, startY, cardWidth, 16, 2, 2, "F");
      doc.setTextColor(94, 107, 95);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(item.label.toUpperCase(), x + 3, startY + 5);
      doc.setTextColor(27, 36, 33);
      doc.setFontSize(10);
      doc.text(item.value, x + 3, startY + 12);
    });
    startY += 22;
  }

  if (definition.filters?.length) {
    doc.setTextColor(94, 107, 95);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Filters: ${definition.filters.join(" | ")}`, 14, startY);
    startY += 6;
  }

  autoTable(doc, {
    body: definition.rows.length ? definition.rows : [["No records matched the selected filters.", ...definition.columns.slice(1).map(() => "")]],
    head: [definition.columns],
    margin: { bottom: 16, left: 14, right: 14 },
    startY,
    styles: { cellPadding: 2.5, font: "helvetica", fontSize: 7.5, lineColor: [215, 220, 203], lineWidth: 0.2, overflow: "linebreak", textColor: [27, 36, 33] },
    headStyles: { fillColor: [31, 45, 61], fontStyle: "bold", textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [247, 248, 242] },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(215, 220, 203);
    doc.line(14, doc.internal.pageSize.getHeight() - 11, pageWidth - 14, doc.internal.pageSize.getHeight() - 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(94, 107, 95);
    doc.text("MyProperty operational report", 14, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
  }

  const filename = `${safeFilename(definition.propertyName)}-${safeFilename(definition.filename)}-${nairobiDay(generatedAt)}.pdf`;
  doc.save(filename);
  return filename;
}
