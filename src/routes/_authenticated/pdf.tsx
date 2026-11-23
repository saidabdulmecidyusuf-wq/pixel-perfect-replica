import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, ClipboardList, FileDown, Medal, Trophy, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card, EmptyState, useRegionName } from "@/components/AppShell";
import { PeriodSelect, defaultPeriod, periodLabel } from "@/components/PeriodSelect";
import { useRankings } from "@/components/RankingsView";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { coursesQuery, rankingsQuery, resultsQuery, studentsQuery, useMe } from "@/lib/data";
import { examLabel, fullName } from "@/lib/format";
import { analysisPdfInput, sheetCourses } from "@/lib/reports";
import { studentScores, type Period } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/pdf")({
  head: () => ({
    meta: [
      { title: "PDF Raporları — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "İmtihan cetveli, kurs sıralaması, öğrenci sıralaması ve eksik analizi PDF olarak." },
      { property: "og:title", content: "PDF Raporları — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "İmtihan cetveli, kurs sıralaması, öğrenci sıralaması ve eksik analizi PDF olarak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PdfPage,
});

function PdfCard({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col p-5">
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="size-5" /></span>
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      <p className="mb-4 mt-1 flex-1 text-sm text-muted-foreground">{text}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </Card>
  );
}

function PdfPage() {
  const { data: me } = useMe();
  const region = useRegionName() ?? "";
  const { data: rk, isLoading } = useQuery(rankingsQuery);
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: students = [] } = useQuery(studentsQuery);
  const { data: results = [] } = useQuery(resultsQuery);
  const exams = rk?.exams ?? [];
  const [period, setPeriod] = useState<Period | null>(null);
  const [analysisCourse, setAnalysisCourse] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const activePeriod = period ?? defaultPeriod(exams);
  const r = useRankings(rk ?? { courses: [], students: [], exams: [], results: [] }, activePeriod);
  const title = periodLabel(activePeriod, exams);
  const fileTag = title.replace(/\s+/g, "-");
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const courseForAnalysis = analysisCourse ?? me?.courseId ?? courses[0]?.id ?? "";

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } catch { toast.error("PDF hazırlanamadı"); } finally { setBusy(null); }
  }

  const sheet = () => run("sheet", async () => {
    if (activePeriod?.kind !== "month") return;
    const exam = exams.find((e) => e.id === activePeriod.examId);
    const blocks = sheetCourses(results.filter((x) => x.exam_id === activePeriod.examId), courses, students);
    if (!blocks.length) { toast.error("Bu ay için sonuç yok."); return; }
    const { examSheetPdf, savePdf } = await import("@/lib/pdf");
    savePdf(await examSheetPdf(region, title, blocks), `imtihan-cetveli-${exam ? examLabel(exam).replace(" ", "-") : ""}.pdf`);
  });

  const courseRanking = () => run("courses", async () => {
    if (!r.courses.length) { toast.error("Bu dönem için sonuç yok."); return; }
    const { courseRankingPdf, savePdf } = await import("@/lib/pdf");
    const rows = r.courses.map((c) => ({ rank: c.rank, name: r.courseName.get(c.course_id) ?? "", average: c.average, gap: c.gapToFirst, students: c.studentCount }));
    savePdf(await courseRankingPdf(region, title, rows), `kurs-siralamasi-${fileTag}.pdf`);
  });

  const studentRanking = () => run("students", async () => {
    if (!r.general.length) { toast.error("Bu dönem için sonuç yok."); return; }
    const { studentRankingPdf, savePdf } = await import("@/lib/pdf");
    const name = (id: string) => { const s = r.studentMap.get(id); return s ? fullName(s) : ""; };
    const general = r.general.map((g) => ({ rank: g.rank, name: name(g.student_id), course: r.courseName.get(g.course_id) ?? "", total: g.total }));
    const perCourse = (rk?.courses ?? [])
      .map((c) => ({ name: c.name, rows: (r.perCourse.get(c.id) ?? []).map((g) => ({ rank: g.rank, name: name(g.student_id), total: g.total })) }))
      .filter((c) => c.rows.length);
    savePdf(await studentRankingPdf(region, title, general, perCourse), `ogrenci-siralamasi-${fileTag}.pdf`);
  });

  const analysis = () => run("analysis", async () => {
    const course = courses.find((c) => c.id === courseForAnalysis);
    if (!course || !activePeriod) return;
    const scores = studentScores(results, exams, activePeriod).filter((s) => s.course_id === course.id && studentMap.has(s.student_id));
    if (!scores.length) { toast.error("Bu kurs için bu dönemde sonuç yok."); return; }
    const { courseAnalysisPdf, savePdf } = await import("@/lib/pdf");
    savePdf(await courseAnalysisPdf(region, title, analysisPdfInput(course.name, scores, studentMap)), `eksik-analizi-${course.name}-${fileTag}.pdf`);
  });

  const btn = (key: string, label: string, onClick: () => void, disabled = false) => (
    <Button onClick={onClick} disabled={disabled || busy !== null}><FileDown /> {busy === key ? "Hazırlanıyor…" : label}</Button>
  );

  if (isLoading) return <AppShell title="PDF Raporları"><EmptyState>Yükleniyor…</EmptyState></AppShell>;
  if (!exams.length) return <AppShell title="PDF Raporları"><EmptyState>Henüz imtihan yapılmadı.</EmptyState></AppShell>;

  return (
    <AppShell title="PDF Raporları" actions={<PeriodSelect exams={exams} value={activePeriod} onChange={setPeriod} />}>
      <p className="mb-4 text-sm font-medium text-muted-foreground">Seçili dönem: {title}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <PdfCard icon={ClipboardList} title="İmtihan Cetveli" text={me?.isAdmin ? "Seçili ayın cetveli; her kurs ayrı sayfada." : "Kursunuzun seçili aydaki cetveli."}>
          {activePeriod?.kind === "month" ? btn("sheet", "Cetveli indir", sheet) : <p className="text-sm text-muted-foreground">Cetvel için yukarıdan bir ay seçin.</p>}
        </PdfCard>
        <PdfCard icon={Medal} title="Kurs Sıralaması" text="Sıra, kurs, başarı ortalaması ve birinciyle fark.">
          {btn("courses", "Kurs sıralamasını indir", courseRanking)}
        </PdfCard>
        <PdfCard icon={Trophy} title="Öğrenci Sıralaması" text="Genel sıralama ve her kursun kendi içindeki sıralaması.">
          {btn("students", "Öğrenci sıralamasını indir", studentRanking)}
        </PdfCard>
        <PdfCard icon={BarChart3} title="Kurs Analiz Raporu" text="Bölüm başarıları, Tecvid eksikleri ve öğrenci bazında eksikler.">
          {courses.length > 1 && (
            <Select value={courseForAnalysis} onValueChange={setAnalysisCourse}>
              <SelectTrigger className="h-10 w-full bg-card sm:w-56"><SelectValue placeholder="Kurs seçin" /></SelectTrigger>
              <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {btn("analysis", "Raporu indir", analysis, !courseForAnalysis)}
        </PdfCard>
      </div>
    </AppShell>
  );
}
