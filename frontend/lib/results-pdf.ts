import { formatPhoneDisplay } from "@/lib/phone-auth";
import { fontFor, registerPdfFonts } from "@/lib/pdf-fonts";

export type ResultsPdfRow = {
  label: string;
  detail?: string;
  score: string;
};

function setTextFont(
  doc: import("jspdf").jsPDF,
  text: string,
  weight: "normal" | "bold"
) {
  doc.setFont(fontFor(text), weight);
}

// App palette (matches frontend/app/globals.css: --emerald-deep, --gold, --cream).
const EMERALD_DEEP: [number, number, number] = [6, 78, 59];
const GOLD: [number, number, number] = [212, 168, 83];
const CREAM: [number, number, number] = [253, 248, 240];

/**
 * Draws the branded header band (emerald fill, gold accent rule, Arabic +
 * English masthead) across the top of the current page and returns the y
 * position content should start at below it.
 */
function drawBrandedHeader(doc: import("jspdf").jsPDF): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const bandHeight = 20;

  doc.setFillColor(...EMERALD_DEEP);
  doc.rect(0, 0, pageWidth, bandHeight, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, bandHeight, pageWidth, 1.2, "F");

  const centerX = pageWidth / 2;

  doc.setTextColor(...CREAM);
  doc.setFont(fontFor("Tajweed Academy"), "bold");
  doc.setFontSize(14);
  doc.text("Tajweed Academy", centerX, 9, { align: "center" });

  const arabicMasthead = "أكاديمية التجويد";
  doc.setTextColor(...GOLD);
  doc.setFont(fontFor(arabicMasthead), "bold");
  doc.setFontSize(11);
  doc.text(arabicMasthead, centerX, 16, { align: "center" });

  doc.setTextColor(0, 0, 0);
  return bandHeight + 10;
}

export async function downloadResultsPdf(options: {
  title: string;
  subtitle?: string;
  phone?: string | null;
  rows: ResultsPdfRow[];
  filename: string;
}) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();
  await registerPdfFonts(doc);
  const phone = formatPhoneDisplay(options.phone);
  let y = drawBrandedHeader(doc);

  setTextFont(doc, options.title, "bold");
  doc.setFontSize(16);
  doc.text(options.title, 14, y);
  y += 8;

  doc.setFontSize(11);
  if (options.subtitle) {
    setTextFont(doc, options.subtitle, "normal");
    doc.text(options.subtitle, 14, y);
    y += 6;
  }
  if (phone !== "—") {
    setTextFont(doc, phone, "normal");
    doc.text(`Phone: ${phone}`, 14, y);
    y += 6;
  }

  const generatedLine = `Generated: ${new Date().toLocaleString()}`;
  setTextFont(doc, generatedLine, "normal");
  doc.text(generatedLine, 14, y);
  y += 4;

  autoTable(doc, {
    startY: y + 4,
    head: [["Item", "Detail", "Score"]],
    body: options.rows.map((row) => [
      row.label.slice(0, 80),
      (row.detail ?? "").slice(0, 80),
      row.score,
    ]),
    styles: { fontSize: 9, cellPadding: 2, font: "NotoSans" },
    headStyles: { fillColor: [15, 81, 50], font: "NotoSans" },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 70 },
      2: { cellWidth: 30 },
    },
    didParseCell: (data) => {
      const text = Array.isArray(data.cell.text)
        ? data.cell.text.join(" ")
        : String(data.cell.text ?? "");
      data.cell.styles.font = fontFor(text);
    },
  });

  doc.save(options.filename);
}

export async function downloadResultsRosterPdf(options: {
  title: string;
  subtitle?: string;
  filename: string;
  sections: Array<{
    title: string;
    head: string[];
    body: string[][];
  }>;
}) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "landscape" });
  await registerPdfFonts(doc);
  let y = drawBrandedHeader(doc);

  setTextFont(doc, options.title, "bold");
  doc.setFontSize(14);
  doc.text(options.title, 14, y);
  y += 7;

  doc.setFontSize(10);
  if (options.subtitle) {
    setTextFont(doc, options.subtitle, "normal");
    doc.text(options.subtitle, 14, y);
    y += 5;
  }
  const generatedLine = `Generated: ${new Date().toLocaleString()}`;
  setTextFont(doc, generatedLine, "normal");
  doc.text(generatedLine, 14, y);
  y += 3;

  for (const [index, section] of options.sections.entries()) {
    if (index > 0) y = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += index === 0 ? 6 : 12;

    setTextFont(doc, section.title, "bold");
    doc.setFontSize(10);
    doc.text(section.title, 14, y);

    autoTable(doc, {
      startY: y + 3,
      head: [section.head],
      body: section.body,
      styles: { fontSize: 8, cellPadding: 1.5, halign: "center", font: "NotoSans" },
      headStyles: { fillColor: [15, 81, 50], halign: "center", font: "NotoSans" },
      columnStyles: {
        0: { halign: "left", cellWidth: 36 },
      },
      didParseCell: (data) => {
        const text = Array.isArray(data.cell.text)
          ? data.cell.text.join(" ")
          : String(data.cell.text ?? "");
        data.cell.styles.font = fontFor(text);
      },
    });
  }

  doc.save(options.filename);
}
