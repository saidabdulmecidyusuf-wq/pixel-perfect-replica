// The monthly "Şifahi İmtihan Cetveli" exactly as on the paper sheet.
// Pure helpers shared by the on-screen sheet and the PDF, so both show the same thing.
import { compareTr, fullName, monthName, trUpper } from "./format";
import { calcKiraat, calcTotal, errorLoss, type ErrorCategory, type KiraatError } from "./scoring";

/** Fixed texts printed on the sheet. Admin can change each one in Ayarlar. */
export const DEFAULT_SHEET_LABELS = {
  titleSuffix: "AYI ŞİFAHİ İMTİHAN CETVELİ",
  bolge: "Bölge",
  mintika: "Mıntıka",
  kurum: "Kurum",
  grupMesulu: "Grup Mesulü",
  grupSeviyesi: "Grup Seviyesi",
  sira: "Sıra",
  adiSoyadi: "Adı Soyadı",
  kiraatTitle: "KIRÂAT",
  kiraatLine: "Toplu Okutma Usulü ile Maharici Hurufuna ve Pratik Tecvid Kaidelerine Dikkat Edilerek Yüzüne Okutulması",
  harfNote: "2 Puan",
  tecvidNote: "Tecvid kaidesindeki Tek Hatada 1 Puan - Aynı tecvid kaidesindeki Mükerrer hatalarda 2 Puan düşülecek",
  kiraatPuan: "KIRÂAT PUANI",
  kiraatMax: "100",
  ezberTitle: "EZBER",
  ezberLine1: "Ezber puanları verilirken 2 Ezber Sorulur",
  ezberLine2: "Kırâat Kıstasları Dikkate Alınır.",
  ezberPart1: "1. Kısım",
  ezberPart2: "2. Kısım",
  ezberPuan: "EZBER PUANI",
  ezberMax: "100",
  ilmihalTitle: "İLMİHAL",
  ilmihalSual1: "1. SUAL",
  ilmihalSual2: "2. SUAL",
  ilmihalSualMax1: "15",
  ilmihalSualMax2: "15",
  ilmihalPuan: "İLMİHAL PUANI",
  ilmihalMax: "100",
  siyerTitle: "SİYER-İ NEBİ",
  siyerSual1: "1. SUAL",
  siyerSual2: "2. SUAL",
  siyerSualMax1: "15",
  siyerSualMax2: "15",
  siyerPuan: "PUANI",
  siyerMax: "100",
  examiner: "İmtihanı İcra Eden Adı Soyadı",
  examDate: "İmtihan Tarihi",
  noteYuzune: "Yüzüne Okuma",
  noteEzber: "Ezber",
  noteIlmihal: "İlmihal",
  noteSiyer: "Siyer-i Nebi",
  noteGenel: "Genel değerlendirme (Talebelerin heyecanı, takkeleri, kılık kıyafetleri, ders kitapları ve ders mahalli keyfiyeti vb.)",
};

export type SheetLabels = typeof DEFAULT_SHEET_LABELS;
export type SheetLabelKey = keyof SheetLabels;

/** Saved texts win; anything missing or blank falls back to the paper sheet. */
export function mergeLabels(saved: unknown): SheetLabels {
  const out = { ...DEFAULT_SHEET_LABELS };
  if (saved && typeof saved === "object") {
    for (const k of Object.keys(out) as SheetLabelKey[]) {
      const v = (saved as Record<string, unknown>)[k];
      if (typeof v === "string" && v.trim()) out[k] = v;
    }
  }
  return out;
}

/** Free-text boxes on each student row. */
export interface SheetMarks {
  ezber1: string;
  ezber2: string;
  ilmihal1: string;
  ilmihal2: string;
  siyer1: string;
  siyer2: string;
}
export const MARK_KEYS: (keyof SheetMarks)[] = ["ezber1", "ezber2", "ilmihal1", "ilmihal2", "siyer1", "siyer2"];
export const emptyMarks = (): SheetMarks => ({ ezber1: "", ezber2: "", ilmihal1: "", ilmihal2: "", siyer1: "", siyer2: "" });
export function toMarks(v: unknown): SheetMarks {
  const m = emptyMarks();
  if (v && typeof v === "object") for (const k of MARK_KEYS) { const x = (v as Record<string, unknown>)[k]; if (x != null) m[k] = String(x); }
  return m;
}

/** Per course, per month: header and footer fields of the sheet. */
export interface SheetInfo {
  examiner: string;
  exam_date: string | null;
  kiraat_topic: string;
  ezber_topic_1: string;
  ezber_topic_2: string;
  note_yuzune: string;
  note_ezber: string;
  note_ilmihal: string;
  note_siyer: string;
  note_genel: string;
}
export const emptyInfo = (): SheetInfo => ({
  examiner: "", exam_date: null, kiraat_topic: "", ezber_topic_1: "", ezber_topic_2: "",
  note_yuzune: "", note_ezber: "", note_ilmihal: "", note_siyer: "", note_genel: "",
});

export interface SheetErrorType {
  id: string;
  name: string;
  category: ErrorCategory;
  deduction: number;
  repeat_deduction: number | null;
  max_deduction: number | null;
}

/** Kıraat columns: Harf errors (Zât-ı Harf) first, then the tecvid rules, as on the paper. */
export function kiraatColumns<T extends SheetErrorType>(types: T[]) {
  return { harf: types.filter((t) => t.category === "harf"), tecvid: types.filter((t) => t.category !== "harf") };
}

export const sheetTitle = (month: number, labels: SheetLabels) => `${trUpper(monthName(month))} ${labels.titleSuffix}`;

/** "2026-10-14" → "14/10/2026"; empty → blank dotted line like the paper. */
export const sheetDate = (d: string | null) => {
  if (!d) return ".........../.........../...............";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

/** Error snapshot stored with a result, so later changes to a type never rewrite old scores. */
export function errorSnapshot(t: SheetErrorType, count: number): KiraatError {
  return { id: t.id, name: t.name, category: t.category, deduction: t.deduction, repeat_deduction: t.repeat_deduction, max_deduction: t.max_deduction, count };
}

export interface SheetRowData {
  no: number;
  studentId: string;
  name: string;
  counts: Record<string, number>;
  kiraat: number;
  ezber: number;
  ilmihal: number;
  siyer: number;
  total: number;
  marks: SheetMarks;
}

export interface SheetResult {
  student_id: string;
  kiraat: number;
  ezber: number;
  ilmihal: number;
  siyer: number;
  total: number;
  kiraat_errors?: KiraatError[] | null;
  sheet_marks?: unknown;
}

/** Rows are numbered 1, 2, 3… in name order (the paper's "Sıra" is a row number, not a rank). */
export function sheetRows(
  students: { id: string; first_name: string; last_name: string }[],
  results: SheetResult[],
): SheetRowData[] {
  const byStudent = new Map(results.map((r) => [r.student_id, r]));
  return [...students]
    .sort((a, b) => compareTr(fullName(a), fullName(b)))
    .map((s, i) => {
      const r = byStudent.get(s.id);
      const counts: Record<string, number> = {};
      for (const e of r?.kiraat_errors ?? []) counts[e.id] = (counts[e.id] ?? 0) + (Number(e.count) || 0);
      return {
        no: i + 1,
        studentId: s.id,
        name: fullName(s),
        counts,
        kiraat: r ? r.kiraat : NaN,
        ezber: r ? r.ezber : NaN,
        ilmihal: r ? r.ilmihal : NaN,
        siyer: r ? r.siyer : NaN,
        total: r ? r.total : NaN,
        marks: toMarks(r?.sheet_marks),
      };
    });
}

/** Live scores while typing on the sheet (same rules as the database). */
export function liveScores(errors: KiraatError[], ezber: number, ilmihal: number, siyer: number) {
  const kiraat = calcKiraat(errors);
  return { kiraat, total: calcTotal({ kiraat, ezber, ilmihal, siyer }), lost: errors.reduce((s, e) => s + errorLoss(e), 0) };
}
