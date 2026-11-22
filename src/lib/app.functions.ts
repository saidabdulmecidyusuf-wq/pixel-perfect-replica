import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { KiraatError } from "./scoring";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throw new Error("Veriler okunamadı");
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

/** Ranking data only: names and scores. No analysis details. */
async function loadRankingData() {
  const db = await admin();
  const [settings, courses, students, exams, results] = await Promise.all([
    db.from("app_settings").select("region_name").eq("id", 1).maybeSingle(),
    db.from("courses").select("id, name").order("created_at"),
    fetchAll((a, b) => db.from("students").select("id, course_id, first_name, last_name").order("id").range(a, b)),
    db.from("exams").select("id, exam_year, exam_month").order("exam_year").order("exam_month"),
    fetchAll((a, b) =>
      db
        .from("exam_results")
        .select("exam_id, student_id, course_id, kiraat, ezber, ilmihal, siyer, total, tecvid_deduction")
        .order("id")
        .range(a, b),
    ),
  ]);
  const num = (v: unknown) => Number(v ?? 0);
  return {
    regionName: settings.data?.region_name ?? "Mıntıka",
    courses: courses.data ?? [],
    students,
    exams: exams.data ?? [],
    results: results.map((r) => ({
      exam_id: r.exam_id,
      student_id: r.student_id,
      course_id: r.course_id,
      kiraat: num(r.kiraat),
      ezber: num(r.ezber),
      ilmihal: num(r.ilmihal),
      siyer: num(r.siyer),
      total: num(r.total),
      tecvid_deduction: num(r.tecvid_deduction),
      kiraat_errors: [] as KiraatError[],
    })),
  };
}

export type RankingData = Awaited<ReturnType<typeof loadRankingData>>;

/** Public, read-only: anyone with the share link. The token is checked on every call. */
export const getSharedRankings = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: s } = await db.from("app_settings").select("share_token").eq("id", 1).maybeSingle();
    if (!s || s.share_token !== data.token) return { ok: false as const };
    return { ok: true as const, data: await loadRankingData() };
  });

/** Signed-in admins and course managers see the same rankings as the share page. */
export const getRankings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.length) throw new Error("Yetkiniz yok");
    return loadRankingData();
  });

export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { needsSetup: (count ?? 0) === 0 };
});

const credentials = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(100),
});

/** Only works while no admin exists: creates the first admin account. */
export const createFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => credentials.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) return { ok: false as const, error: "Yönetici hesabı zaten var." };
    const { data: created, error } = await db.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false as const, error: "Hesap oluşturulamadı." };
    await db.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    return { ok: true as const };
  });

async function assertAdmin(ctx: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Bu işlem için yönetici olmalısınız");
}

export const createManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => credentials.extend({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: created, error } = await db.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      return { ok: false as const, error: error?.message?.includes("already") ? "Bu e-posta zaten kayıtlı." : "Hesap oluşturulamadı." };
    }
    await db.from("user_roles").insert({ user_id: created.user.id, role: "course_manager" });
    await db.from("course_managers").insert({ user_id: created.user.id, course_id: data.courseId, email: data.email });
    return { ok: true as const };
  });

export const deleteManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Kendi hesabınızı silemezsiniz");
    const db = await admin();
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: data.userId, _role: "admin" });
    if (isAdmin) throw new Error("Yönetici hesabı silinemez");
    await db.from("course_managers").delete().eq("user_id", data.userId);
    await db.auth.admin.deleteUser(data.userId);
    return { ok: true };
  });

export const regenerateShareToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const token = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    const db = await admin();
    await db.from("app_settings").update({ share_token: token, updated_at: new Date().toISOString() }).eq("id", 1);
    return { token };
  });

/** Region name is shown on the sign-in page and the share page; not private. */
export const getRegionName = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data } = await db.from("app_settings").select("region_name").eq("id", 1).maybeSingle();
  return data?.region_name ?? "Mıntıka";
});
