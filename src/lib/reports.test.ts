import { describe, expect, it } from "vitest";
import { sheetCourses } from "./reports";
import type { ResultRow } from "./scoring";

const row = (student_id: string, course_id: string, total: number, extra: Partial<ResultRow> = {}): ResultRow => ({
  exam_id: "e1", student_id, course_id, kiraat: 100, ezber: total, ilmihal: total, siyer: total, total, tecvid_deduction: 0, ...extra,
});

describe("exam sheet rows", () => {
  const courses = [{ id: "c1", name: "Merkez" }, { id: "c2", name: "Bole" }];
  const students = ["a", "b", "c", "d"].map((id, i) => ({ id, course_id: i < 3 ? "c1" : "c2", first_name: id.toUpperCase(), last_name: "X" }));

  it("ranks inside each course with shared ranks for equal totals (1,1,2)", () => {
    const blocks = sheetCourses([row("a", "c1", 90), row("b", "c1", 90), row("c", "c1", 80), row("d", "c2", 50)], courses, students);
    expect(blocks[0]?.rows.map((r) => r.rank)).toEqual([1, 1, 2]);
    expect(blocks[1]?.rows.map((r) => r.rank)).toEqual([1]);
  });

  it("counts Tecvid, Harf and other errors separately", () => {
    const errs = [
      { id: "1", name: "İhfa", category: "tecvid" as const, deduction: 1, count: 2 },
      { id: "2", name: "Med", category: "tecvid" as const, deduction: 1, count: 1 },
      { id: "3", name: "Harf", category: "harf" as const, deduction: 2, count: 4 },
    ];
    const [block] = sheetCourses([row("a", "c1", 90, { kiraat_errors: errs })], courses, students);
    expect(block?.rows[0]).toMatchObject({ tecvid: 3, harf: 4, diger: 0 });
  });

  it("leaves out courses with no results", () => {
    expect(sheetCourses([row("a", "c1", 90)], courses, students).map((b) => b.name)).toEqual(["Merkez"]);
  });
});
