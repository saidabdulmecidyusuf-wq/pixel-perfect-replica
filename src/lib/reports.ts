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
