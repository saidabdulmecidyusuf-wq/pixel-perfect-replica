// Pure scoring, ranking and analysis rules. No I/O here so it can be tested and shared
// by the admin app, the course-manager view and the public share page.

export type ErrorCategory = "tecvid" | "harf" | "diger";

export interface KiraatError {
  id: string;
  name: string;
  category: ErrorCategory;
  deduction: number;
  /** Points for each further error of the same type; missing = same as `deduction`. */
  repeat_deduction?: number | null;
  /** Most points one error type can remove; missing = no limit. */
  max_deduction?: number | null;
  count: number;
}

export interface Course {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  course_id: string;
  first_name: string;
  last_name: string;
}

export interface Exam {
  id: string;
  exam_year: number;
  exam_month: number;
}

export interface ResultRow {
  exam_id: string;
  student_id: string;
  course_id: string;
  kiraat: number;
  ezber: number;
  ilmihal: number;
  siyer: number;
  total: number;
  tecvid_deduction: number;
  kiraat_errors?: KiraatError[] | null;
}

export const SECTIONS = [
  { key: "kiraat", label: "Kıraat" },
  { key: "ezber", label: "Ezber" },
  { key: "ilmihal", label: "İlmihal" },
  { key: "siyer", label: "Siyer-i Nebi" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  tecvid: "Tecvid",
  harf: "Harf",
  diger: "Diğer",
};

export const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

type Deductible = Pick<KiraatError, "count" | "deduction"> & Partial<Pick<KiraatError, "repeat_deduction" | "max_deduction">>;

/**
 * Points one error type removes: the first error costs `deduction`, each further
 * error `repeat_deduction`, capped at `max_deduction`. The paper sheet's tecvid rule
 * ("tek hatada 1, mükerrer hatada 2 puan") is deduction 1, repeat 1, max 2.
 */
export function errorLoss(e: Deductible): number {
  const n = Math.max(0, Math.floor(Number(e.count) || 0));
  if (!n) return 0;
  const first = Number(e.deduction) || 0;
  const repeat = e.repeat_deduction == null ? first : Number(e.repeat_deduction) || 0;
  const lost = first + (n - 1) * repeat;
  return e.max_deduction == null ? lost : Math.min(Number(e.max_deduction), lost);
}

/** Kıraat starts at 100 and loses the points of every error type. Never below 0. */
export function calcKiraat(errors: Deductible[]): number {
  return round2(clamp(100 - errors.reduce((sum, e) => sum + errorLoss(e), 0)));
}

export function calcTecvidDeduction(errors: KiraatError[]): number {
  return round2(errors.filter((e) => e.category === "tecvid").reduce((s, e) => s + errorLoss(e), 0));
}

/** The four sections weigh 25% each. */
export function calcTotal(s: Record<SectionKey, number>): number {
  return round2((clamp(s.kiraat) + clamp(s.ezber) + clamp(s.ilmihal) + clamp(s.siyer)) / 4);
}

/**
 * Sorts by score (high first). Equal scores share a rank and the next
 * different score takes the next number: 100, 100, 100, 98 → 1, 1, 1, 2.
 */
export function denseRank<T>(items: T[], score: (t: T) => number): Array<T & { rank: number }> {
  const sorted = [...items].sort((a, b) => score(b) - score(a));
  let rank = 0;
  let prev: number | null = null;
  return sorted.map((item) => {
    const s = round2(score(item));
    if (prev === null || s !== prev) {
      rank += 1;
      prev = s;
    }
    return { ...item, rank };
  });
}

// ---------- Periods ----------

export type Period = { kind: "month"; examId: string } | { kind: "year"; year: number };

export function examsInPeriod(exams: Exam[], period: Period): Exam[] {
  if (period.kind === "month") return exams.filter((e) => e.id === period.examId);
  // Calendar year: January–December.
  return exams.filter((e) => e.exam_year === period.year);
}

// ---------- Student scores for a period ----------

export interface ErrorTally {
  name: string;
  category: ErrorCategory;
  count: number;
}

export interface StudentScore {
  student_id: string;
  course_id: string;
  kiraat: number;
  ezber: number;
  ilmihal: number;
  siyer: number;
  total: number;
  tecvidDeduction: number;
  examsTaken: number;
  errors: ErrorTally[];
}

/** One score per student for the period. For a year, each section is the average of the months taken. */
export function studentScores(results: ResultRow[], exams: Exam[], period: Period): StudentScore[] {
  const examIds = new Set(examsInPeriod(exams, period).map((e) => e.id));
  const byStudent = new Map<string, ResultRow[]>();
  for (const r of results) {
    if (!examIds.has(r.exam_id)) continue;
    const list = byStudent.get(r.student_id) ?? [];
    list.push(r);
    byStudent.set(r.student_id, list);
  }
  const out: StudentScore[] = [];
  for (const [studentId, rows] of byStudent) {
    const n = rows.length;
    const avg = (k: keyof ResultRow) => round2(rows.reduce((s, r) => s + Number(r[k] ?? 0), 0) / n);
    const tallies = new Map<string, ErrorTally>();
    for (const r of rows) {
      for (const e of r.kiraat_errors ?? []) {
        if (!e.count) continue;
        const key = `${e.category}:${e.name}`;
        const t = tallies.get(key) ?? { name: e.name, category: e.category, count: 0 };
        t.count += Number(e.count) || 0;
        tallies.set(key, t);
      }
    }
    const last = rows[rows.length - 1]!;
    out.push({
      student_id: studentId,
      course_id: last.course_id,
      kiraat: avg("kiraat"),
      ezber: avg("ezber"),
      ilmihal: avg("ilmihal"),
      siyer: avg("siyer"),
      total: avg("total"),
      tecvidDeduction: avg("tecvid_deduction"),
      examsTaken: n,
      errors: [...tallies.values()].sort((a, b) => b.count - a.count),
    });
  }
  return out;
}

// ---------- Rankings ----------

export function rankStudents(scores: StudentScore[], courseId?: string) {
  const list = courseId ? scores.filter((s) => s.course_id === courseId) : scores;
  return denseRank(list, (s) => s.total);
}

export interface CourseStanding {
  course_id: string;
  average: number;
  studentCount: number;
  rank: number;
  gapToFirst: number;
}

/** Course average = plain mean of its students' scores, so a bigger course gets no advantage. */
export function rankCourses(scores: StudentScore[]): CourseStanding[] {
  const groups = new Map<string, number[]>();
  for (const s of scores) {
    const g = groups.get(s.course_id) ?? [];
    g.push(s.total);
    groups.set(s.course_id, g);
  }
  const rows = [...groups].map(([course_id, totals]) => ({
    course_id,
    average: round2(totals.reduce((a, b) => a + b, 0) / totals.length),
    studentCount: totals.length,
  }));
  const ranked = denseRank(rows, (r) => r.average);
  const top = ranked[0]?.average ?? 0;
  return ranked.map((r) => ({ ...r, gapToFirst: round2(top - r.average) }));
}

// ---------- Analysis ----------

export type Level = "basarili" | "iyi" | "gelistirilmeli" | "zayif";

export const LEVEL_LABELS: Record<Level, string> = {
  basarili: "Başarılı",
  iyi: "İyi durumda",
  gelistirilmeli: "Geliştirilmesi gerekiyor",
  zayif: "Zayıf",
};

export function levelOf(score: number): Level {
  if (score >= 85) return "basarili";
  if (score >= 70) return "iyi";
  if (score >= 55) return "gelistirilmeli";
  return "zayif";
}

export interface TecvidAnalysis {
  affectedShare: number; // 0–1, students with at least one Tecvid error
  label: string;
  level: Level;
  topRules: { name: string; count: number; students: number }[];
}

export function analyzeTecvid(scores: StudentScore[]): TecvidAnalysis {
  const n = scores.length || 1;
  const rules = new Map<string, { name: string; count: number; students: number }>();
  let affected = 0;
  for (const s of scores) {
    const tecvid = s.errors.filter((e) => e.category === "tecvid" && e.count > 0);
    if (tecvid.length) affected += 1;
    for (const e of tecvid) {
      const r = rules.get(e.name) ?? { name: e.name, count: 0, students: 0 };
      r.count += e.count;
      r.students += 1;
      rules.set(e.name, r);
    }
  }
  const share = scores.length ? affected / n : 0;
  let label = "Eksiklik görülmedi.";
  let level: Level = "basarili";
  if (share >= 0.5) {
    label = "Öğrencilerin çoğunda eksiklik var.";
    level = "zayif";
  } else if (share >= 0.25) {
    label = "Bazı öğrencilerde eksiklik var.";
    level = "gelistirilmeli";
  } else if (share > 0) {
    label = "Az sayıda öğrencide eksiklik var.";
    level = "iyi";
  }
  return {
    affectedShare: share,
    label,
    level,
    topRules: [...rules.values()].sort((a, b) => b.count - a.count),
  };
}

export interface SectionAnalysis {
  key: SectionKey;
  label: string;
  average: number;
  level: Level;
}

export interface CourseAnalysis {
  studentCount: number;
  overall: number;
  sections: SectionAnalysis[];
  tecvid: TecvidAnalysis;
  weakAreas: string[];
  strongest: SectionAnalysis | null;
  summary: string;
}

const joinTr = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ve ${items[items.length - 1]}`;

export function analyzeGroup(scores: StudentScore[]): CourseAnalysis {
  const n = scores.length;
  const mean = (k: SectionKey | "total") => (n ? round2(scores.reduce((s, x) => s + x[k], 0) / n) : 0);
  const sections: SectionAnalysis[] = SECTIONS.map(({ key, label }) => {
    const average = mean(key);
    return { key, label, average, level: levelOf(average) };
  });
  const overall = mean("total");
  const tecvid = analyzeTecvid(scores);

  if (!n) {
    return {
      studentCount: 0,
      overall: 0,
      sections,
      tecvid,
      weakAreas: [],
      strongest: null,
      summary: "Bu dönem için henüz sonuç girilmedi.",
    };
  }

  const sectionMean = sections.reduce((s, x) => s + x.average, 0) / sections.length;
  const weak = sections.filter((s) => s.average < 70 || s.average <= sectionMean - 5).map((s) => s.label);
  const tecvidWeak = tecvid.affectedShare >= 0.5;
  const weakAreas = tecvidWeak ? [...weak, "Tecvid"] : weak;
  const strongest = [...sections].sort((a, b) => b.average - a.average)[0] ?? null;

  const parts: string[] = [];
  if (weakAreas.length) {
    parts.push(`Bu kursta öğrencilerin ${joinTr(weakAreas)} başarıları diğer derslere göre düşük.`);
  } else {
    parts.push("Bu kursta dersler arasında belirgin bir eksiklik görülmedi.");
  }
  if (tecvid.affectedShare >= 0.25 && tecvid.topRules.length) {
    const rules = tecvid.topRules.slice(0, 3).map((r) => r.name);
    parts.push(`Özellikle Tecvid kurallarına (${joinTr(rules)}) daha fazla çalışma yapılması önerilir.`);
  }
  if (strongest && strongest.level === "basarili") {
    parts.push(`En başarılı ders: ${strongest.label}.`);
  }

  return { studentCount: n, overall, sections, tecvid, weakAreas, strongest, summary: parts.join(" ") };
}

export interface StudentAnalysis {
  weakSections: string[];
  tecvidRules: ErrorTally[];
  otherErrors: ErrorTally[];
}

export function analyzeStudent(s: StudentScore): StudentAnalysis {
  return {
    weakSections: SECTIONS.filter(({ key }) => s[key] < 70).map((x) => x.label),
    tecvidRules: s.errors.filter((e) => e.category === "tecvid"),
    otherErrors: s.errors.filter((e) => e.category !== "tecvid"),
  };
}

export interface RegionAnalysis {
  best: SectionAnalysis | null;
  worst: SectionAnalysis | null;
  improve: string | null;
  sections: SectionAnalysis[];
}

/** Region view: each course counts once (mean of course averages), so big courses don't dominate. */
export function analyzeRegion(scores: StudentScore[]): RegionAnalysis {
  const byCourse = new Map<string, StudentScore[]>();
  for (const s of scores) byCourse.set(s.course_id, [...(byCourse.get(s.course_id) ?? []), s]);
  const courseAnalyses = [...byCourse.values()].map(analyzeGroup);
  if (!courseAnalyses.length) return { best: null, worst: null, improve: null, sections: [] };

  const sections: SectionAnalysis[] = SECTIONS.map(({ key, label }) => {
    const average = round2(
      courseAnalyses.reduce((s, c) => s + (c.sections.find((x) => x.key === key)?.average ?? 0), 0) /
        courseAnalyses.length,
    );
    return { key, label, average, level: levelOf(average) };
  });
  const sorted = [...sections].sort((a, b) => b.average - a.average);
  const tecvid = analyzeTecvid(scores);
  const topRule = tecvid.topRules[0];
  return {
    best: sorted[0] ?? null,
    worst: sorted[sorted.length - 1] ?? null,
    improve: topRule ? `Tecvid – ${topRule.name}` : (sorted[sorted.length - 1]?.label ?? null),
    sections,
  };
}
