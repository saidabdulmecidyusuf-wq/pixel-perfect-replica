import { describe, expect, it } from "vitest";
import {
  calcKiraat,
  calcTotal,
  denseRank,
  rankCourses,
  studentScores,
  type Exam,
  type ResultRow,
  type StudentScore,
} from "./scoring";

const score = (course_id: string, total: number): StudentScore => ({
  student_id: `${course_id}-${total}-${Math.random()}`,
  course_id,
  kiraat: total,
  ezber: total,
  ilmihal: total,
  siyer: total,
  total,
  tecvidDeduction: 0,
  examsTaken: 1,
  errors: [],
});

describe("Kıraat", () => {
  it("starts at 100 and removes count × deduction", () => {
    expect(calcKiraat([{ count: 3, deduction: 2 }, { count: 1, deduction: 5 }])).toBe(89);
  });
  it("tecvid rule as on the paper sheet: one error 1 point, repeated errors 2 points", () => {
    const rule = { deduction: 1, repeat_deduction: 1, max_deduction: 2 };
    expect(calcKiraat([{ ...rule, count: 1 }])).toBe(99);
    expect(calcKiraat([{ ...rule, count: 2 }])).toBe(98);
    expect(calcKiraat([{ ...rule, count: 5 }])).toBe(98);
  });
  it("Zât-ı Harf removes 2 points for every error", () => {
    expect(calcKiraat([{ deduction: 2, repeat_deduction: 2, max_deduction: null, count: 3 }])).toBe(94);
  });
  it("never goes below 0", () => {
    expect(calcKiraat([{ count: 40, deduction: 5 }])).toBe(0);
  });
});

describe("Overall score", () => {
  it("weights the four sections 25% each", () => {
    expect(calcTotal({ kiraat: 100, ezber: 80, ilmihal: 60, siyer: 40 })).toBe(70);
  });
});

describe("Student ranking", () => {
  it("gives equal scores the same rank without skipping: 100,100,100,98,95 → 1,1,1,2,3", () => {
    const ranked = denseRank(
      [
        { n: "Hüseyin", s: 98 },
        { n: "Bilal", s: 100 },
        { n: "Mesud", s: 95 },
        { n: "Kasım", s: 100 },
        { n: "Habibullah", s: 100 },
      ],
      (x) => x.s,
    );
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 1, 2, 3]);
    expect(ranked[3]?.n).toBe("Hüseyin");
  });
});

describe("Course ranking", () => {
  it("uses the mean of students, so more students give no advantage", () => {
    const scores = [score("big", 80), score("big", 80), score("big", 80), score("big", 80), score("small", 90)];
    const ranked = rankCourses(scores);
    expect(ranked[0]?.course_id).toBe("small");
    expect(ranked[1]?.average).toBe(80);
    expect(ranked[1]?.gapToFirst).toBe(10);
  });
  it("puts courses with equal averages on the same rank", () => {
    const ranked = rankCourses([score("a", 90), score("b", 90), score("c", 85)]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 2]);
  });
});

describe("Yearly period", () => {
  it("uses the calendar year (January–December) and averages the months", () => {
    const exams: Exam[] = [
      { id: "dec25", exam_year: 2025, exam_month: 12 },
      { id: "jan26", exam_year: 2026, exam_month: 1 },
      { id: "dec26", exam_year: 2026, exam_month: 12 },
    ];
    const row = (exam_id: string, total: number): ResultRow => ({
      exam_id,
      student_id: "s1",
      course_id: "c1",
      kiraat: total,
      ezber: total,
      ilmihal: total,
      siyer: total,
      total,
      tecvid_deduction: 0,
    });
    const res = studentScores([row("dec25", 50), row("jan26", 80), row("dec26", 100)], exams, {
      kind: "year",
      year: 2026,
    });
    expect(res[0]?.examsTaken).toBe(2);
    expect(res[0]?.total).toBe(90);
  });
});
