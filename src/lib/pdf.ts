// Browser-only PDF builders (jsPDF). Imported dynamically from click handlers.
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { fmt, trUpper } from "./format";

const GREEN: [number, number, number] = [31, 92, 72];
const GOLD: [number, number, number] = [196, 152, 60];
const INK: [number, number, number] = [35, 52, 46];
const SOFT: [number, number, number] = [246, 243, 234];

let fontCache: { regular: string; bold: string } | null = null;

async function toBase64(url: string) {
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function newDoc(orientation: "portrait" | "landscape" = "portrait") {
  if (!fontCache) {
    const [regular, bold] = await Promise.all([toBase64("/fonts/NotoSans-Regular.ttf"), toBase64("/fonts/NotoSans-Bold.ttf")]);
    fontCache = { regular, bold };
  }
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  doc.addFileToVFS("NotoSans-Regular.ttf", fontCache.regular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", fontCache.bold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  doc.setFont("NotoSans", "normal");
  return doc;
}

function header(doc: jsPDF, region: string, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, w, 26, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 26, w, 1.2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(9);
  doc.text(trUpper(region), w / 2, 9, { align: "center" });
  doc.setFontSize(15);
  doc.text(title, w / 2, 17, { align: "center" });
  if (subtitle) {
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(9);
    doc.text(subtitle, w / 2, 22.5, { align: "center" });
  }
  doc.setTextColor(...INK);
  return 34;
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 125);
    doc.text(`Sayfa ${i} / ${pages}`, w - 12, h - 7, { align: "right" });
    doc.text(new Date().toLocaleDateString("tr-TR"), 12, h - 7);
  }
}

const tableStyle = {
  styles: { font: "NotoSans", fontSize: 9.5, textColor: INK, cellPadding: 2.2, lineColor: [220, 215, 200] as [number, number, number], lineWidth: 0.2 },
  headStyles: { fillColor: GREEN, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const, halign: "center" as const },
  alternateRowStyles: { fillColor: SOFT },
  margin: { left: 10, right: 10 },
};

const lastY = (doc: jsPDF) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...GREEN);
  doc.text(text, 10, y);
  doc.setTextColor(...INK);
  return y + 3;
}

// ---------- İmtihan cetveli ----------

export interface SheetRow {
  rank: number;
  name: string;
  tecvid: number;
  harf: number;
  diger: number;
  kiraat: number;
  ezber: number;
  ilmihal: number;
  siyer: number;
  total: number;
}

export async function examSheetPdf(region: string, examTitle: string, courses: { name: string; rows: SheetRow[]; average: number }[]) {
  const doc = await newDoc("landscape");
  courses.forEach((c, i) => {
    if (i > 0) doc.addPage();
    let y = header(doc, region, "İMTİHAN CETVELİ", examTitle);
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(13);
    doc.text(`Kurs: ${trUpper(c.name)}`, 10, y + 2);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(10);
    doc.text(`Öğrenci: ${c.rows.length}   •   Kurs ortalaması: ${fmt(c.average)}`, doc.internal.pageSize.getWidth() - 10, y + 2, { align: "right" });
    y += 6;
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [
        [
          { content: "Sıra", rowSpan: 2 },
          { content: "Öğrencinin Adı Soyadı", rowSpan: 2 },
          { content: "KIRAAT", colSpan: 4 },
          { content: "EZBER", rowSpan: 2 },
          { content: "İLMİHAL", rowSpan: 2 },
          { content: "SİYER-İ NEBİ", rowSpan: 2 },
          { content: "ORTALAMA", rowSpan: 2 },
        ],
        ["Tecvid H.", "Harf H.", "Diğer H.", "Puan"],
      ],
      body: c.rows.map((r) => [
        r.rank, r.name, r.tecvid || "", r.harf || "", r.diger || "", fmt(r.kiraat), fmt(r.ezber), fmt(r.ilmihal), fmt(r.siyer), fmt(r.total),
      ]) as RowInput[],
      columnStyles: {
        0: { halign: "center", cellWidth: 13 },
        1: { fontStyle: "bold", fontSize: 11, cellWidth: 70 },
        2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" },
        5: { halign: "center", fontStyle: "bold" }, 6: { halign: "center" }, 7: { halign: "center" }, 8: { halign: "center" },
        9: { halign: "center", fontStyle: "bold", fillColor: [236, 244, 239] },
      },
    });
    doc.setFontSize(8.5);
    doc.setTextColor(110, 120, 115);
    doc.text("Kıraat 100 puandan başlar, hatalara göre puan düşülür. Dört bölüm eşit ağırlıktadır (%25).", 10, lastY(doc) + 6);
    doc.setTextColor(...INK);
  });
  footer(doc);
  return doc;
}

// ---------- Sıralamalar ----------

export async function courseRankingPdf(region: string, periodTitle: string, rows: { rank: number; name: string; average: number; gap: number; students: number }[]) {
  const doc = await newDoc();
  const y = header(doc, region, "KURS SIRALAMASI", periodTitle);
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Sıra", "Kurs", "Öğrenci", "Başarı Ortalaması", "Birinciyle Fark"]],
    body: rows.map((r) => [r.rank, trUpper(r.name), r.students, fmt(r.average), r.gap ? `-${fmt(r.gap)}` : "—"]),
    columnStyles: { 0: { halign: "center", cellWidth: 16 }, 1: { fontStyle: "bold", fontSize: 11 }, 2: { halign: "center" }, 3: { halign: "center", fontStyle: "bold" }, 4: { halign: "center" } },
  });
  footer(doc);
  return doc;
}

export async function studentRankingPdf(
  region: string,
  periodTitle: string,
  general: { rank: number; name: string; course: string; total: number }[],
  perCourse: { name: string; rows: { rank: number; name: string; total: number }[] }[],
) {
  const doc = await newDoc();
  let y = header(doc, region, "ÖĞRENCİ SIRALAMASI", periodTitle);
  y = sectionTitle(doc, "Genel Sıralama (Bütün Kurslar)", y + 2);
  autoTable(doc, {
    ...tableStyle,
    startY: y + 1,
    head: [["Sıra", "Öğrenci", "Kurs", "Puan"]],
    body: general.map((r) => [r.rank, r.name, r.course, fmt(r.total)]),
    columnStyles: { 0: { halign: "center", cellWidth: 16 }, 1: { fontStyle: "bold", fontSize: 11 }, 3: { halign: "center", fontStyle: "bold", cellWidth: 24 } },
  });
  for (const c of perCourse) {
    doc.addPage();
    let yy = header(doc, region, "KURS İÇİ SIRALAMA", periodTitle);
    yy = sectionTitle(doc, `Kurs: ${trUpper(c.name)}`, yy + 2);
    autoTable(doc, {
      ...tableStyle,
      startY: yy + 1,
      head: [["Sıra", "Öğrenci", "Puan"]],
      body: c.rows.map((r) => [r.rank, r.name, fmt(r.total)]),
      columnStyles: { 0: { halign: "center", cellWidth: 16 }, 1: { fontStyle: "bold", fontSize: 11 }, 2: { halign: "center", fontStyle: "bold", cellWidth: 24 } },
    });
  }
  footer(doc);
  return doc;
}

// ---------- Eksik analizi ----------

export interface AnalysisPdfInput {
  courseName: string;
  overall: number;
  studentCount: number;
  sections: { label: string; average: number; levelLabel: string }[];
  tecvidLabel: string;
  tecvidRules: { name: string; count: number; students: number }[];
  summary: string;
  students: { name: string; total: number; weak: string; tecvid: string }[];
}

export async function courseAnalysisPdf(region: string, periodTitle: string, a: AnalysisPdfInput) {
  const doc = await newDoc();
  let y = header(doc, region, "EKSİK ANALİZİ VE BAŞARI RAPORU", periodTitle);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(14);
  doc.text(`KURS: ${trUpper(a.courseName)}`, 10, y + 3);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10);
  doc.text(`Öğrenci: ${a.studentCount}   •   Genel ortalama: ${fmt(a.overall)}`, 10, y + 9);
  y += 13;
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Bölüm", "Ortalama", "Durum"]],
    body: [...a.sections.map((s) => [s.label, fmt(s.average), s.levelLabel]), ["Tecvid", "—", a.tecvidLabel]],
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "center" } },
  });
  y = lastY(doc) + 7;
  y = sectionTitle(doc, "Otomatik Rapor", y);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10.5);
  const lines = doc.splitTextToSize(a.summary, doc.internal.pageSize.getWidth() - 20);
  doc.text(lines, 10, y + 3);
  y += 5 + lines.length * 5;
  if (a.tecvidRules.length) {
    y = sectionTitle(doc, "Tecvid Hataları (Kural Bazında)", y + 2);
    autoTable(doc, {
      ...tableStyle,
      startY: y + 1,
      head: [["Kural", "Toplam Hata", "Hata Yapan Öğrenci"]],
      body: a.tecvidRules.map((r) => [r.name, r.count, r.students]),
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
    });
    y = lastY(doc) + 7;
  }
  y = sectionTitle(doc, "Öğrenci Bazında Eksikler", y + 2);
  autoTable(doc, {
    ...tableStyle,
    startY: y + 1,
    head: [["Öğrenci", "Puan", "Geliştirilmesi Gereken", "Tecvid Hataları"]],
    body: a.students.map((s) => [s.name, fmt(s.total), s.weak || "—", s.tecvid || "—"]),
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "center", cellWidth: 18 } },
  });
  footer(doc);
  return doc;
}

export function savePdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}
