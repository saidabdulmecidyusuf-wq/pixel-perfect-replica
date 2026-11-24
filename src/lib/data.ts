import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Course, Exam, KiraatError, ResultRow, Student, ErrorCategory } from "./scoring";
import { getRankings, getSheetSettings } from "./app.functions";
import { toMarks, type SheetInfo, type SheetMarks } from "./sheet";

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

export interface Me {
  userId: string;
  email: string;
  isAdmin: boolean;
  courseId: string | null;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: roles }, { data: mgr }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("course_managers").select("course_id").eq("user_id", u.user.id).maybeSingle(),
    ]);
    return {
      userId: u.user.id,
      email: u.user.email ?? "",
      isAdmin: !!roles?.some((r) => r.role === "admin"),
      courseId: mgr?.course_id ?? null,
    };
  },
  staleTime: 60_000,
});

export const useMe = () => useQuery(meQuery);

export interface CourseRow extends Course {
  group_leader: string;
  group_level: string;
}

export const coursesQuery = queryOptions({
  queryKey: ["courses"],
  queryFn: async (): Promise<CourseRow[]> => {
    const { data, error } = await supabase.from("courses").select("id, name, group_leader, group_level").order("created_at");
    if (error) throw new Error(error.message);
    return data;
  },
});

export const studentsQuery = queryOptions({
  queryKey: ["students"],
  queryFn: async (): Promise<(Student & { created_at: string })[]> =>
    fetchAll((a, b) =>
      supabase.from("students").select("id, course_id, first_name, last_name, created_at").order("created_at").range(a, b),
    ),
});

export const examsQuery = queryOptions({
  queryKey: ["exams"],
  queryFn: async (): Promise<Exam[]> => {
    const { data, error } = await supabase
      .from("exams")
      .select("id, exam_year, exam_month")
      .order("exam_year", { ascending: false })
      .order("exam_month", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
});

export interface ErrorType {
  id: string;
  name: string;
  category: ErrorCategory;
  deduction: number;
  repeat_deduction: number | null;
  max_deduction: number | null;
  sort_order: number;
}

export const errorTypesQuery = queryOptions({
  queryKey: ["error_types"],
  queryFn: async (): Promise<ErrorType[]> => {
    const { data, error } = await supabase
      .from("error_types")
      .select("id, name, category, deduction, repeat_deduction, max_deduction, sort_order")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data.map((d) => ({
      ...d,
      deduction: Number(d.deduction),
      repeat_deduction: d.repeat_deduction == null ? null : Number(d.repeat_deduction),
      max_deduction: d.max_deduction == null ? null : Number(d.max_deduction),
    }));
  },
});

export interface ResultWithId extends ResultRow {
  id: string;
  sheet_marks: SheetMarks;
}

const mapResult = (r: Record<string, unknown>): ResultWithId => ({
  id: String(r["id"]),
  exam_id: String(r["exam_id"]),
  student_id: String(r["student_id"]),
  course_id: String(r["course_id"]),
  kiraat: Number(r["kiraat"] ?? 0),
  ezber: Number(r["ezber"] ?? 0),
  ilmihal: Number(r["ilmihal"] ?? 0),
  siyer: Number(r["siyer"] ?? 0),
  total: Number(r["total"] ?? 0),
  tecvid_deduction: Number(r["tecvid_deduction"] ?? 0),
  kiraat_errors: (r["kiraat_errors"] as KiraatError[] | null) ?? [],
  sheet_marks: toMarks(r["sheet_marks"]),
});

/** Full results with error details (RLS limits course managers to their own course). */
export const resultsQuery = queryOptions({
  queryKey: ["results"],
  queryFn: async (): Promise<ResultWithId[]> => {
    const rows = await fetchAll((a, b) => supabase.from("exam_results").select("*").order("id").range(a, b));
    return rows.map((r) => mapResult(r as Record<string, unknown>));
  },
});

export const examResultsQuery = (examId: string) =>
  queryOptions({
    queryKey: ["results", examId],
    queryFn: async (): Promise<ResultWithId[]> => {
      const rows = await fetchAll((a, b) =>
        supabase.from("exam_results").select("*").eq("exam_id", examId).order("id").range(a, b),
      );
      return rows.map((r) => mapResult(r as Record<string, unknown>));
    },
  });

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data } = await supabase.from("app_settings").select("region_name, bolge_name, sheet_labels, share_token").eq("id", 1).maybeSingle();
    return data;
  },
});

export const managersQuery = queryOptions({
  queryKey: ["managers"],
  queryFn: async () => {
    const { data, error } = await supabase.from("course_managers").select("user_id, course_id, email").order("created_at");
    if (error) throw new Error(error.message);
    return data;
  },
});

export const rankingsQuery = queryOptions({
  queryKey: ["rankings"],
  queryFn: () => getRankings(),
});

/** Region, Bölge and the sheet's printed texts; readable by every signed-in user. */
export const sheetSettingsQuery = queryOptions({
  queryKey: ["sheet-settings"],
  queryFn: () => getSheetSettings(),
  staleTime: 60_000,
});

export interface ExamSheetRow extends SheetInfo {
  exam_id: string;
  course_id: string;
}

export const examSheetsQuery = (examId: string) =>
  queryOptions({
    queryKey: ["exam_sheets", examId],
    queryFn: async (): Promise<ExamSheetRow[]> => {
      const { data, error } = await supabase.from("exam_sheets").select("*").eq("exam_id", examId);
      if (error) throw new Error(error.message);
      return data;
    },
  });
