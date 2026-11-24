// Turns stored results into the rows the PDF builders and the analysis page need.
// Pure functions only, shared by the exam sheet page, the PDF page and the analysis page.
import { fullName } from "./format";
import {
  CATEGORY_LABELS, LEVEL_LABELS, analyzeGroup, analyzeStudent, denseRank,
  type Course, type ErrorCategory, type KiraatError, type ResultRow, type Student, type StudentScore,
} from "./scoring";

const sumCat = (errs: KiraatError[], c: ErrorCategory) =>
  errs.filter((e) => e.category === c).reduce((s, e) => s + (Number(e.count) || 0), 0);

/** One block per course (courses without results are left out), ranked inside the course. */
export function sheetCourses(examResults: ResultRow[], courses: Course[], students: Student[]) {
  const byId = new Map(students.map((s) => [s.id, s]));
  return courses
    .map((c) => {
      const rs = examResults.filter((r) => r.course_id === c.id && byId.has(r.student_id));
      return {
        name: c.name,
        average: rs.length ? rs.reduce((s, r) => s + r.total, 0) / rs.length : 0,
        rows: denseRank(rs, (r) => r.total).map((r) => {
          const errs = r.kiraat_errors ?? [];
          return {
            rank: r.rank,
            name: fullName(byId.get(r.student_id)!),
            tecvid: sumCat(errs, "tecvid"),
            harf: sumCat(errs, "harf"),
            diger: sumCat(errs, "diger"),
            kiraat: r.kiraat, ezber: r.ezber, ilmihal: r.ilmihal, siyer: r.siyer, total: r.total,
          };
        }),
      };
    })
    .filter((c) => c.rows.length);
}

export function analysisPdfInput(courseName: string, scores: StudentScore[], studentMap: Map<string, Student>) {
  const a = analyzeGroup(scores);
  const students = denseRank(scores, (s) => s.total).map((s) => {
    const sa = analyzeStudent(s);
    const st = studentMap.get(s.student_id);
    return {
      name: st ? fullName(st) : "",
      total: s.total,
      weak: sa.weakSections.join(", "),
      tecvid: sa.tecvidRules.map((e) => `${e.name} (${e.count})`).join(", "),
    };
  });
  return {
    courseName,
    overall: a.overall,
    studentCount: a.studentCount,
    sections: a.sections.map((s) => ({ label: s.label, average: s.average, levelLabel: LEVEL_LABELS[s.level] })),
    tecvidLabel: a.tecvid.label,
    tecvidRules: a.tecvid.topRules,
    summary: a.summary,
    students,
  };
}

export const errorText = (e: { name: string; category: ErrorCategory; count: number }) =>
  `${e.category === "tecvid" ? "" : `${CATEGORY_LABELS[e.category]}: `}${e.name} (${e.count})`;

// ---------- Paper-style exam sheet ----------
import { kiraatColumns, mergeLabels, sheetRows, sheetTitle, emptyInfo, type SheetErrorType, type SheetInfo, type SheetResult } from "./sheet";

export interface SheetSources {
  exam: { exam_month: number };
  courses: { id: string; name: string; group_leader?: string; group_level?: string }[];
  students: Student[];
  results: (SheetResult & { course_id: string })[];
  errorTypes: SheetErrorType[];
  sheets: ({ course_id: string } & SheetInfo)[];
  settings: { regionName: string; bolgeName: string; labels: unknown } | undefined;
  /** Leave scores out (printable blank sheet with names). */
  blank?: boolean;
}

/** One sheet per course that has students, in the paper layout. */
export function sheetPdfInputs(src: SheetSources) {
  const labels = mergeLabels(src.settings?.labels);
  const { harf, tecvid } = kiraatColumns(src.errorTypes);
  return src.courses
    .map((c) => {
      const list = src.students.filter((s) => s.course_id === c.id);
      const rows = sheetRows(list, src.blank ? [] : src.results.filter((r) => r.course_id === c.id));
      const info = src.sheets.find((s) => s.course_id === c.id) ?? emptyInfo();
      return {
        title: sheetTitle(src.exam.exam_month, labels),
        labels,
        bolge: src.settings?.bolgeName ?? "",
        mintika: src.settings?.regionName ?? "",
        kurum: c.name,
        grupMesulu: c.group_leader ?? "",
        grupSeviyesi: c.group_level ?? "",
        harf: harf.map((t) => ({ id: t.id, name: t.name })),
        tecvid: tecvid.map((t) => ({ id: t.id, name: t.name })),
        info,
        rows,
      };
    })
    .filter((s) => s.rows.length);
}
