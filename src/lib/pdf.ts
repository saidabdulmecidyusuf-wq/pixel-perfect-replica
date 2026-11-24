// Browser-only PDF builders (jsPDF). Imported dynamically from click handlers.
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { fmt, trUpper } from "./format";
import { sheetDate, type SheetInfo, type SheetLabels, type SheetRowData } from "./sheet";

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

async function newDoc(orientation: "portrait" | "landscape" = "portrait", unit: "mm" | "pt" = "mm") {
  if (!fontCache) {
    const [regular, bold] = await Promise.all([toBase64("/fonts/NotoSans-Regular.ttf"), toBase64("/fonts/NotoSans-Bold.ttf")]);
    fontCache = { regular, bold };
  }
  const doc = new jsPDF({ orientation, unit, format: "a4" });
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

// ---------- İmtihan cetveli (kâğıttaki cetvelin aynısı, A4 yatay, ölçüler pt) ----------

export interface ExamSheetPdfInput {
  title: string;
  labels: SheetLabels;
  bolge: string;
  mintika: string;
  kurum: string;
  grupMesulu: string;
  grupSeviyesi: string;
  harf: { id: string; name: string }[];
  tecvid: { id: string; name: string }[];
  info: SheetInfo;
  rows: SheetRowData[];
}

type RGB = [number, number, number];
const S_INK: RGB = [41, 97, 102];
const S_LINE: RGB = [76, 133, 133];
const S_GRID: RGB = [189, 217, 217];
const S_KIRAAT: RGB = [230, 224, 204];
const S_EZBER: RGB = [224, 222, 240];
const S_TEAL: RGB = [214, 232, 232];
const S_PUAN_HEAD: RGB = [217, 209, 178];
const S_PUAN_BODY: RGB = [214, 230, 230];

const ROWS_PER_PAGE = 20;
const TOP = 108, BAND = 127, NOTE = 195, BODY = 208, ROW_H = 12.4, BOTTOM = 456;

function fitSize(doc: jsPDF, text: string, size: number, maxW: number, bold = false) {
  doc.setFont("NotoSans", bold ? "bold" : "normal");
  let s = size;
  doc.setFontSize(s);
  while (s > 2.6 && doc.getTextWidth(text) > maxW) { s -= 0.2; doc.setFontSize(s); }
  return s;
}

function txt(doc: jsPDF, text: string, x: number, y: number, size: number, opts: { bold?: boolean; align?: "left" | "center" | "right"; maxW?: number } = {}) {
  if (!text) return;
  if (opts.maxW) fitSize(doc, text, size, opts.maxW, opts.bold);
  else { doc.setFont("NotoSans", opts.bold ? "bold" : "normal"); doc.setFontSize(size); }
  doc.setTextColor(...S_INK);
  doc.text(text, x, y, { align: opts.align ?? "left" });
}

/** Text that reads bottom-to-top inside a header column, like the paper sheet. */
function vtxt(doc: jsPDF, text: string, cx: number, size: number, maxH: number, colW: number, bold = false) {
  if (!text) return;
  doc.setTextColor(...S_INK);
  doc.setFont("NotoSans", bold ? "bold" : "normal");
  doc.setFontSize(size);
  const bottom = NOTE - 3;
  if (doc.getTextWidth(text) <= maxH || colW < 9) {
    const s = fitSize(doc, text, size, maxH, bold);
    doc.text(text, cx + s * 0.36, bottom, { angle: 90 });
    return;
  }
  // Two lines (e.g. "İdğâm Bahsi - / Müşeddede - Şefevi").
  const words = text.split(" ");
  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  const lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  let s = Math.min(size, colW / 2.6);
  for (const l of lines) s = Math.min(s, fitSize(doc, l, s, maxH, bold));
  doc.setFontSize(s);
  doc.text(lines[0]!, cx - s * 0.2, bottom, { angle: 90 });
  doc.text(lines[1]!, cx + s * 0.9, bottom, { angle: 90 });
}

function line(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, color: RGB, w: number) {
  doc.setDrawColor(...color);
  doc.setLineWidth(w);
  doc.line(x1, y1, x2, y2);
}

function wrapped(doc: jsPDF, text: string, x: number, y: number, maxW: number, maxLines: number, size = 6.4) {
  if (!text) return;
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(size);
  doc.setTextColor(...S_INK);
  const lines = (doc.splitTextToSize(text, maxW) as string[]).slice(0, maxLines);
  doc.text(lines, x, y, { lineHeightFactor: 1.15 });
}

const num = (n: number) => (Number.isFinite(n) ? fmt(n) : "");

function drawSheetPage(doc: jsPDF, d: ExamSheetPdfInput, pageRows: SheetRowData[], firstNo: number) {
  const L = d.labels;
  // Title band
  doc.setFillColor(...S_KIRAAT);
  doc.rect(44, 22, 776, 15, "F");
  txt(doc, d.title, 432, 33, 10, { bold: true, align: "center", maxW: 760 });

  // Info block
  const info: [string, string][] = [
    [L.bolge, d.bolge], [L.mintika, d.mintika], [L.kurum, d.kurum], [L.grupMesulu, d.grupMesulu], [L.grupSeviyesi, d.grupSeviyesi],
  ];
  info.forEach(([k, v], i) => {
    const y = 50 + i * 12.5;
    txt(doc, k, 38, y, 8, { maxW: 108 });
    txt(doc, ":", 150, y, 8);
    txt(doc, trUpper(v), 158, y, 8, { bold: true, maxW: 300 });
  });

  // Frame geometry
  const kir = { x1: 228, x2: 474 }, ezb = { x1: 480, x2: 672 }, ilm = { x1: 678, x2: 746 }, siy = { x1: 752, x2: 820 };
  const kirPuan = { x1: 442, x2: 474 };
  const harfEnd = d.harf.length ? 282 : 228;
  const split = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => ({ x1: a + ((b - a) * i) / n, x2: a + ((b - a) * (i + 1)) / n }));
  const harfCols = split(228, harfEnd, d.harf.length);
  const tecvidCols = split(harfEnd, 442, d.tecvid.length);
  const ezb1 = { x1: 480, x2: 568 }, ezb2 = { x1: 568, x2: 640 }, ezbPuan = { x1: 640, x2: 672 };
  const ilm1 = { x1: 678, x2: 695 }, ilm2 = { x1: 695, x2: 712 }, ilmPuan = { x1: 712, x2: 746 };
  const siy1 = { x1: 752, x2: 769 }, siy2 = { x1: 769, x2: 786 }, siyPuan = { x1: 786, x2: 820 };
  const mid = (c: { x1: number; x2: number }) => (c.x1 + c.x2) / 2;

  // Fills
  const band = (f: { x1: number; x2: number }, color: RGB) => { doc.setFillColor(...color); doc.rect(f.x1, TOP, f.x2 - f.x1, BAND - TOP, "F"); };
  band(kir, S_KIRAAT); band(ezb, S_EZBER); band(ilm, S_TEAL); band(siy, S_TEAL);
  for (const p of [kirPuan, ezbPuan, ilmPuan, siyPuan]) {
    doc.setFillColor(...S_PUAN_HEAD); doc.rect(p.x1, BAND, p.x2 - p.x1, BODY - BAND, "F");
    doc.setFillColor(...S_PUAN_BODY); doc.rect(p.x1, BODY, p.x2 - p.x1, BOTTOM - BODY, "F");
  }

  // Light grid inside the body
  const rowYs = Array.from({ length: ROWS_PER_PAGE - 1 }, (_, i) => BODY + ROW_H * (i + 1));
  for (const [a, b] of [[kir.x1, kirPuan.x1], [ezb.x1, ezbPuan.x1], [ilm.x1, ilmPuan.x1], [siy.x1, siyPuan.x1]] as const) {
    for (const y of rowYs) line(doc, a, y, b, y, S_GRID, 0.4);
  }
  const vgrid = (x: number) => line(doc, x, BODY, x, BOTTOM, S_GRID, 0.4);
  if (d.harf.length === 1) { const w = (harfEnd - 228) / 4; [1, 2, 3].forEach((i) => vgrid(228 + w * i)); }
  harfCols.slice(1).forEach((c) => vgrid(c.x1));
  tecvidCols.slice(1).forEach((c) => vgrid(c.x1));
  for (let x = 496; x < 568; x += 12) vgrid(x);
  for (let x = 580; x < 640; x += 12) vgrid(x);
  vgrid(695); vgrid(769);

  // Header lines
  const hsep = (x: number) => line(doc, x, BAND, x, NOTE, S_LINE, 0.7);
  harfCols.slice(1).forEach((c) => hsep(c.x1));
  tecvidCols.slice(1).forEach((c) => hsep(c.x1));
  hsep(695); hsep(769);
  if (d.harf.length && d.tecvid.length) { line(doc, harfEnd, BAND, harfEnd, NOTE, S_LINE, 0.7); line(doc, harfEnd, NOTE, harfEnd, BOTTOM, S_LINE, 0.9); }
  line(doc, 568, BAND, 568, BOTTOM, S_LINE, 0.9);
  for (const f of [kir, ezb, ilm, siy]) {
    line(doc, f.x1, NOTE, f.x2, NOTE, S_LINE, 0.9);
    line(doc, f.x1, BODY, f.x2, BODY, S_LINE, 0.9);
  }
  doc.setDrawColor(...S_LINE);
  for (const p of [kirPuan, ezbPuan, ilmPuan, siyPuan]) { doc.setLineWidth(1); doc.rect(p.x1, BAND, p.x2 - p.x1, BODY - BAND); doc.rect(p.x1, BODY, p.x2 - p.x1, BOTTOM - BODY); }
  for (const [f] of [[kir], [ezb], [ilm], [siy]] as const) { doc.setLineWidth(1); doc.rect(f.x1, TOP, f.x2 - f.x1, BAND - TOP); doc.setLineWidth(1.1); doc.rect(f.x1, TOP, f.x2 - f.x1, BOTTOM - TOP); }

  // Band texts
  txt(doc, L.kiraatTitle, mid(kir), 114.5, 5, { bold: true, align: "center", maxW: 236 });
  txt(doc, d.info.kiraat_topic, mid(kir), 119.5, 4.2, { align: "center", maxW: 236 });
  txt(doc, L.kiraatLine, mid(kir), 124, 3.6, { align: "center", maxW: 238 });
  txt(doc, L.ezberTitle, mid(ezb), 114.5, 5, { bold: true, align: "center", maxW: 184 });
  txt(doc, L.ezberLine1, mid(ezb), 119.5, 3.8, { align: "center", maxW: 184 });
  txt(doc, L.ezberLine2, mid(ezb), 124, 3.8, { align: "center", maxW: 184 });
  txt(doc, L.ilmihalTitle, mid(ilm), 120, 5, { bold: true, align: "center", maxW: 62 });
  txt(doc, L.siyerTitle, mid(siy), 120, 5, { bold: true, align: "center", maxW: 62 });

  // Vertical column headers
  const HH = NOTE - BAND - 6;
  for (let i = 0; i < d.harf.length; i++) vtxt(doc, d.harf[i]!.name, mid(harfCols[i]!), 6.2, HH, harfCols[i]!.x2 - harfCols[i]!.x1);
  for (let i = 0; i < d.tecvid.length; i++) vtxt(doc, d.tecvid[i]!.name, mid(tecvidCols[i]!), 5.6, HH, tecvidCols[i]!.x2 - tecvidCols[i]!.x1);
  vtxt(doc, L.kiraatPuan, mid(kirPuan), 6.8, BODY - BAND - 20, 32, true);
  doc.setFont("NotoSans", "normal"); doc.setFontSize(5.4);
  vtxt(doc, d.info.ezber_topic_1, ezb1.x1 + 10.5 - 1.9, 5.4, HH, 16);
  vtxt(doc, d.info.ezber_topic_2, ezb2.x1 + 10.5 - 1.9, 5.4, HH, 16);
  vtxt(doc, L.ezberPuan, mid(ezbPuan), 6.8, BODY - BAND - 20, 32, true);
  vtxt(doc, L.ilmihalSual1, mid(ilm1), 5.6, HH, 17); vtxt(doc, L.ilmihalSual2, mid(ilm2), 5.6, HH, 17);
  vtxt(doc, L.ilmihalPuan, mid(ilmPuan), 6.8, BODY - BAND - 20, 34, true);
  vtxt(doc, L.siyerSual1, mid(siy1), 5.6, HH, 17); vtxt(doc, L.siyerSual2, mid(siy2), 5.6, HH, 17);
  vtxt(doc, L.siyerPuan, mid(siyPuan), 6.8, BODY - BAND - 20, 34, true);

  // Note row
  if (d.harf.length) txt(doc, L.harfNote, (228 + harfEnd) / 2, 204, 5.4, { align: "center", maxW: harfEnd - 230 });
  if (d.tecvid.length) {
    doc.setFont("NotoSans", "normal"); doc.setFontSize(3.6);
    const lines = (doc.splitTextToSize(L.tecvidNote, 442 - harfEnd - 6) as string[]).slice(0, 2);
    lines.forEach((l, i) => txt(doc, l, (harfEnd + 442) / 2, lines.length === 1 ? 203 : 199.8 + i * 4.2, 3.6, { align: "center" }));
  }
  txt(doc, L.kiraatMax, mid(kirPuan), 204, 5.4, { align: "center" });
  txt(doc, L.ezberPart1, mid(ezb1), 204, 5.4, { align: "center", maxW: 84 });
  txt(doc, L.ezberPart2, mid(ezb2), 204, 5.4, { align: "center", maxW: 68 });
  txt(doc, L.ezberMax, mid(ezbPuan), 204, 5.4, { align: "center" });
  txt(doc, L.ilmihalSualMax1, mid(ilm1), 204, 5.4, { align: "center", maxW: 15 });
  txt(doc, L.ilmihalSualMax2, mid(ilm2), 204, 5.4, { align: "center", maxW: 15 });
  txt(doc, L.ilmihalMax, mid(ilmPuan), 204, 5.4, { align: "center" });
  txt(doc, L.siyerSualMax1, mid(siy1), 204, 5.4, { align: "center", maxW: 15 });
  txt(doc, L.siyerSualMax2, mid(siy2), 204, 5.4, { align: "center", maxW: 15 });
  txt(doc, L.siyerMax, mid(siyPuan), 204, 5.4, { align: "center" });

  // Name column
  txt(doc, L.sira, 39, 203, 8);
  txt(doc, L.adiSoyadi, 80, 203, 8);
  line(doc, 36, 207, 222, 207, S_LINE, 1);
  for (let i = 0; i < ROWS_PER_PAGE; i++) {
    const yLine = BODY + ROW_H * (i + 1);
    line(doc, 36, yLine, 222, yLine, S_LINE, 0.5);
    const y = BODY + ROW_H * i + ROW_H / 2 + 2.2;
    txt(doc, String(firstNo + i), 52, y, 6.2, { align: "center" });
    const r = pageRows[i];
    if (!r) continue;
    txt(doc, r.name, 64, y, 7, { bold: true, maxW: 156 });
    const cell = (c: { x1: number; x2: number }, v: string, size = 6.4, bold = false) =>
      txt(doc, v, mid(c), y, size, { align: "center", bold, maxW: c.x2 - c.x1 - 1.5 });
    d.harf.forEach((t, k) => cell(harfCols[k]!, r.counts[t.id] ? String(r.counts[t.id]) : ""));
    d.tecvid.forEach((t, k) => cell(tecvidCols[k]!, r.counts[t.id] ? String(r.counts[t.id]) : ""));
    cell(kirPuan, num(r.kiraat), 6.8, true);
    cell(ezb1, r.marks.ezber1, 6); cell(ezb2, r.marks.ezber2, 6);
    cell(ezbPuan, num(r.ezber), 6.8, true);
    cell(ilm1, r.marks.ilmihal1, 5.6); cell(ilm2, r.marks.ilmihal2, 5.6);
    cell(ilmPuan, num(r.ilmihal), 6.8, true);
    cell(siy1, r.marks.siyer1, 5.6); cell(siy2, r.marks.siyer2, 5.6);
    cell(siyPuan, num(r.siyer), 6.8, true);
  }

  // Footer
  doc.setDrawColor(...S_LINE); doc.setLineWidth(1);
  txt(doc, L.examiner, 129, 468, 6.4, { align: "center", maxW: 184 });
  doc.rect(36, 471, 186, 26);
  txt(doc, trUpper(d.info.examiner), 129, 486.5, 8, { align: "center", bold: true, maxW: 180 });
  txt(doc, L.examDate, 129, 509, 6.4, { align: "center", maxW: 184 });
  doc.rect(36, 513, 186, 26);
  txt(doc, sheetDate(d.info.exam_date), 129, 529, d.info.exam_date ? 8 : 6.5, { align: "center", bold: !!d.info.exam_date });
  const notes: [number, number, number, number, string, string][] = [
    [228, 461, 246, 36, L.noteYuzune, d.info.note_yuzune],
    [480, 461, 192, 36, L.noteEzber, d.info.note_ezber],
    [678, 461, 68, 36, L.noteIlmihal, d.info.note_ilmihal],
    [752, 461, 68, 36, L.noteSiyer, d.info.note_siyer],
    [228, 502, 592, 37, L.noteGenel, d.info.note_genel],
  ];
  for (const [x, y, w, h, label, value] of notes) {
    doc.setDrawColor(...S_LINE); doc.setLineWidth(1); doc.rect(x, y, w, h);
    txt(doc, label, x + 3, y + 8, 6.6, { maxW: w - 6 });
    wrapped(doc, value, x + 3, y + 16, w - 6, 3, 6);
  }
}

/** One or more course sheets; each course gets as many pages as it needs (20 rows per page). */
export async function examSheetPdf(sheets: ExamSheetPdfInput[]) {
  const doc = await newDoc("landscape", "pt");
  let first = true;
  for (const d of sheets) {
    const pages = Math.max(1, Math.ceil(d.rows.length / ROWS_PER_PAGE));
    for (let p = 0; p < pages; p++) {
      if (!first) doc.addPage();
      first = false;
      drawSheetPage(doc, d, d.rows.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE), p * ROWS_PER_PAGE + 1);
    }
  }
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
