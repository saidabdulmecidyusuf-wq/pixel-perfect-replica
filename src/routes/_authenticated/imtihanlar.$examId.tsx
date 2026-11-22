import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FileDown, Minus, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Card, EmptyState } from "@/components/AppShell";
import { useRegionName } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sortStudents } from "@/components/StudentManager";
import { coursesQuery, errorTypesQuery, examResultsQuery, examsQuery, studentsQuery, type ErrorType } from "@/lib/data";
import { courseColorVar, examLabel, fmt, fullName, trUpper } from "@/lib/format";
import { CATEGORY_LABELS, calcKiraat, calcTotal, denseRank, type ErrorCategory, type KiraatError } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/imtihanlar/$examId")({
  head: () => ({
    meta: [
      { title: "İmtihan Cetveli — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Kıraat, Ezber, İlmihal ve Siyer-i Nebi puan girişi." },
      { property: "og:title", content: "İmtihan Cetveli — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Kıraat, Ezber, İlmihal ve Siyer-i Nebi puan girişi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExamSheet,
});

interface Draft {
  errors: KiraatError[];
  ezber: string;
  ilmihal: string;
  siyer: string;
  dirty: boolean;
  exists: boolean;
}

const toNum = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
};

const sumCat = (errs: KiraatError[], c: ErrorCategory) => errs.filter((e) => e.category === c).reduce((s, e) => s + e.count, 0);

function ExamSheet() {
  const { examId } = Route.useParams();
  const qc = useQueryClient();
  const region = useRegionName();
  const { data: exams = [] } = useQuery(examsQuery);
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: students = [] } = useQuery(studentsQuery);
  const { data: errorTypes = [] } = useQuery(errorTypesQuery);
  const { data: results, isSuccess } = useQuery(examResultsQuery(examId));
  const exam = exams.find((e) => e.id === examId);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const activeCourse = courseId ?? courses[0]?.id ?? null;
  const ids = courses.map((c) => c.id);

  useEffect(() => {
    if (!isSuccess) return;
    const next: Record<string, Draft> = {};
    for (const s of students) {
      const r = results.find((x) => x.student_id === s.id);
      next[s.id] = {
        errors: r?.kiraat_errors ?? [],
        ezber: r ? String(r.ezber) : "",
        ilmihal: r ? String(r.ilmihal) : "",
        siyer: r ? String(r.siyer) : "",
        dirty: false,
        exists: !!r,
      };
    }
    setDrafts(next);
  }, [isSuccess, results, students]);

  const list = useMemo(() => sortStudents(students.filter((s) => s.course_id === activeCourse)), [students, activeCourse]);
  const dirtyCount = Object.values(drafts).filter((d) => d.dirty).length;

  const update = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id]!, ...patch, dirty: true } }));

  async function saveAll() {
    const rows = Object.entries(drafts)
      .filter(([, d]) => d.dirty)
      .map(([sid, d]) => {
        const st = students.find((s) => s.id === sid)!;
        return {
          exam_id: examId,
          student_id: sid,
          course_id: st.course_id,
          kiraat_errors: d.errors.filter((e) => e.count > 0) as unknown as never,
          ezber: toNum(d.ezber),
          ilmihal: toNum(d.ilmihal),
          siyer: toNum(d.siyer),
        };
      });
    if (!rows.length) return;
    setSaving(true);
    const { error } = await supabase.from("exam_results").upsert(rows, { onConflict: "exam_id,student_id" });
    setSaving(false);
    if (error) return toast.error("Kaydedilemedi: " + error.message);
    toast.success(`${rows.length} öğrencinin puanı kaydedildi`);
    qc.invalidateQueries();
  }

  async function downloadPdf() {
    const { examSheetPdf, savePdf } = await import("@/lib/pdf");
    const byCourse = courses
      .map((c) => {
        const rs = (results ?? []).filter((r) => r.course_id === c.id);
        const ranked = denseRank(rs, (r) => r.total);
        return {
          name: c.name,
          average: rs.length ? rs.reduce((s, r) => s + r.total, 0) / rs.length : 0,
          rows: ranked.map((r) => {
            const s = students.find((x) => x.id === r.student_id);
            const errs = r.kiraat_errors ?? [];
            return {
              rank: r.rank,
              name: s ? fullName(s) : "",
              tecvid: sumCat(errs, "tecvid"),
              harf: sumCat(errs, "harf"),
              diger: sumCat(errs, "diger"),
              kiraat: r.kiraat, ezber: r.ezber, ilmihal: r.ilmihal, siyer: r.siyer, total: r.total,
            };
          }),
        };
      })
      .filter((c) => c.rows.length);
    if (!byCourse.length) return toast.error("Önce puan girip kaydedin.");
    const doc = await examSheetPdf(region ?? "", exam ? `${examLabel(exam)} İmtihanı` : "", byCourse);
    savePdf(doc, `imtihan-cetveli-${exam ? examLabel(exam).replace(" ", "-") : ""}.pdf`);
  }

  if (!exam) return <AppShell><EmptyState>İmtihan bulunamadı.</EmptyState></AppShell>;

  const editingStudent = editing ? students.find((s) => s.id === editing) : null;

  return (
    <AppShell
      title={`${examLabel(exam)} İmtihan Cetveli`}
      actions={
        <>
          <Button variant="outline" onClick={downloadPdf}><FileDown /> Cetveli PDF indir</Button>
          <Button onClick={saveAll} disabled={!dirtyCount || saving}><Save /> {saving ? "Kaydediliyor…" : `Kaydet${dirtyCount ? ` (${dirtyCount})` : ""}`}</Button>
        </>
      }
    >
      <Link to="/imtihanlar" className="-mt-4 mb-4 inline-block text-sm text-muted-foreground hover:underline">← İmtihanlar</Link>
      {courses.length === 0 ? (
        <EmptyState>Önce kurs ve öğrenci ekleyin.</EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => setCourseId(c.id)}
                style={courseColorVar(ids, c.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  activeCourse === c.id ? "course-tint border-transparent course-text" : "bg-card hover:bg-secondary",
                )}
              >
                <span className="course-dot size-2 rounded-full" />
                {c.name}
              </button>
            ))}
          </div>

          <p className="mb-3 text-sm text-muted-foreground">
            Kıraat 100'den başlar; hata eklemek için Kıraat kutusuna dokunun. Ezber, İlmihal ve Siyer-i Nebi 0–100 arası girilir. Ortalama = dört bölümün eşit (%25) ortalaması.
          </p>

          {list.length === 0 ? (
            <EmptyState>Bu kursta öğrenci yok.</EmptyState>
          ) : (
            <Card className="course-stripe overflow-hidden" style={courseColorVar(ids, activeCourse ?? "")}>
              <div className="course-tint hidden grid-cols-[1fr_repeat(5,6rem)] gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                <span>Öğrenci</span><span className="text-center">Kıraat</span><span className="text-center">Ezber</span><span className="text-center">İlmihal</span><span className="text-center">Siyer-i Nebi</span><span className="text-center">Ortalama</span>
              </div>
              <div className="divide-y">
                {list.map((s) => {
                  const d = drafts[s.id];
                  if (!d) return null;
                  const kiraat = calcKiraat(d.errors);
                  const filled = d.exists || d.dirty;
                  const total = calcTotal({ kiraat, ezber: toNum(d.ezber), ilmihal: toNum(d.ilmihal), siyer: toNum(d.siyer) });
                  const errCount = d.errors.reduce((a, e) => a + e.count, 0);
                  return (
                    <div key={s.id} className={cn("grid grid-cols-4 items-center gap-2 px-4 py-3 md:grid-cols-[1fr_repeat(5,6rem)]", d.dirty && "bg-gold-soft")}>
                      <p className="student-name col-span-4 md:col-span-1">{fullName(s)}</p>
                      <button
                        onClick={() => setEditing(s.id)}
                        className="flex h-12 flex-col items-center justify-center rounded-lg border bg-card text-center transition hover:border-primary"
                      >
                        <span className="text-base font-bold">{fmt(kiraat)}</span>
                        <span className="text-[11px] text-muted-foreground">{errCount ? `${errCount} hata` : "hata ekle"}</span>
                      </button>
                      {(["ezber", "ilmihal", "siyer"] as const).map((k) => (
                        <Input
                          key={k}
                          inputMode="decimal"
                          aria-label={k}
                          placeholder={k === "ezber" ? "Ezber" : k === "ilmihal" ? "İlmihal" : "Siyer"}
                          value={d[k]}
                          onChange={(e) => update(s.id, { [k]: e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5) })}
                          className="h-12 bg-card text-center text-base font-semibold"
                        />
                      ))}
                      <div className="col-span-4 flex h-12 items-center justify-end gap-2 md:col-span-1 md:justify-center">
                        <span className="text-xs text-muted-foreground md:hidden">Ortalama</span>
                        <span className="text-xl font-extrabold text-primary">{filled ? fmt(total) : "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {dirtyCount > 0 && (
            <div className="sticky bottom-4 mt-4 flex justify-end">
              <Button size="lg" onClick={saveAll} disabled={saving} className="shadow-lift"><Save /> {saving ? "Kaydediliyor…" : `${dirtyCount} değişikliği kaydet`}</Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editingStudent && drafts[editingStudent.id] && (
          <KiraatDialog
            name={fullName(editingStudent)}
            types={errorTypes}
            errors={drafts[editingStudent.id]!.errors}
            onChange={(errors) => update(editingStudent.id, { errors })}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </AppShell>
  );
}

function KiraatDialog({ name, types, errors, onChange, onDone }: {
  name: string; types: ErrorType[]; errors: KiraatError[]; onChange: (e: KiraatError[]) => void; onDone: () => void;
}) {
  const countOf = (t: ErrorType) => errors.find((e) => e.id === t.id)?.count ?? 0;
  const setCount = (t: ErrorType, count: number) => {
    const rest = errors.filter((e) => e.id !== t.id);
    onChange(count > 0 ? [...rest, { id: t.id, name: t.name, category: t.category, deduction: t.deduction, count }] : rest);
  };
  // Keep errors of types that were deleted later (history stays intact).
  const orphan = errors.filter((e) => !types.some((t) => t.id === e.id));
  const kiraat = calcKiraat(errors);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Kıraat — {name}</DialogTitle>
        <DialogDescription>100 puandan başlar. Her hata için belirlenen puan düşülür.</DialogDescription>
      </DialogHeader>
      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
        <span className="font-semibold">Kıraat puanı</span>
        <span className="text-2xl font-extrabold">{fmt(kiraat)}</span>
      </div>
      {(["tecvid", "harf", "diger"] as const).map((cat) => {
        const list = types.filter((t) => t.category === cat);
        if (!list.length) return null;
        return (
          <div key={cat}>
            <p className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[cat]} hataları</p>
            <div className="divide-y rounded-xl border">
              {list.map((t) => {
                const c = countOf(t);
                return (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">−{fmt(t.deduction)} puan</p>
                    </div>
                    <Button variant="outline" size="icon" aria-label="Azalt" onClick={() => setCount(t, Math.max(0, c - 1))} disabled={!c}><Minus /></Button>
                    <span className="w-8 text-center text-lg font-bold">{c}</span>
                    <Button variant="outline" size="icon" aria-label="Artır" onClick={() => setCount(t, c + 1)}><Plus /></Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {orphan.length > 0 && (
        <p className="text-xs text-muted-foreground">Silinmiş hata türleri: {orphan.map((o) => `${o.name} (${o.count})`).join(", ")}</p>
      )}
      <DialogFooter><Button onClick={onDone}>Tamam</Button></DialogFooter>
    </DialogContent>
  );
}
