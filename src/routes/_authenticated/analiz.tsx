import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card, EmptyState, RankBadge, useRegionName } from "@/components/AppShell";
import { PeriodSelect, defaultPeriod, periodLabel } from "@/components/PeriodSelect";
import { Button } from "@/components/ui/button";
import { coursesQuery, examsQuery, resultsQuery, studentsQuery, useMe } from "@/lib/data";
import { courseColorVar, fmt, fullName, trUpper } from "@/lib/format";
import { analysisPdfInput, errorText } from "@/lib/reports";
import {
  LEVEL_LABELS, analyzeGroup, analyzeRegion, analyzeStudent, denseRank, studentScores,
  type Level, type Period, type SectionAnalysis,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analiz")({
  head: () => ({
    meta: [
      { title: "Eksik Analizi — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Kurs, öğrenci ve mıntıka bazında bölüm başarıları ve Tecvid eksikleri." },
      { property: "og:title", content: "Eksik Analizi — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Kurs, öğrenci ve mıntıka bazında bölüm başarıları ve Tecvid eksikleri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalysisPage,
});

const LEVEL_STYLE: Record<Level, { bar: string; chip: string }> = {
  basarili: { bar: "bg-success", chip: "bg-success-soft text-success" },
  iyi: { bar: "bg-primary", chip: "bg-primary-soft text-primary" },
  gelistirilmeli: { bar: "bg-warning", chip: "bg-warning-soft text-warning" },
  zayif: { bar: "bg-destructive", chip: "bg-destructive-soft text-destructive" },
};

function LevelChip({ level, text }: { level: Level; text?: string }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", LEVEL_STYLE[level].chip)}>{text ?? LEVEL_LABELS[level]}</span>;
}

function SectionBars({ sections }: { sections: SectionAnalysis[] }) {
  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <div key={s.key}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-semibold">{s.label}</span>
            <span className="flex items-center gap-2">
              <LevelChip level={s.level} />
              <b className="w-12 text-right">{fmt(s.average)}</b>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", LEVEL_STYLE[s.level].bar)} style={{ width: `${Math.min(100, s.average)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const REGION = "__region__";

function AnalysisPage() {
  const { data: me } = useMe();
  const region = useRegionName();
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: students = [] } = useQuery(studentsQuery);
  const { data: exams = [] } = useQuery(examsQuery);
  const { data: results = [], isLoading } = useQuery(resultsQuery);
  const [period, setPeriod] = useState<Period | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const activePeriod = period ?? defaultPeriod(exams);
  const isAdmin = !!me?.isAdmin;
  const ids = courses.map((c) => c.id);
  const selected = pick ?? (isAdmin ? REGION : (me?.courseId ?? courses[0]?.id ?? null));

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const scores = useMemo(
    () => (activePeriod ? studentScores(results, exams, activePeriod).filter((s) => studentMap.has(s.student_id)) : []),
    [results, exams, activePeriod, studentMap],
  );

  if (isLoading) return <AppShell title="Eksik Analizi"><EmptyState>Yükleniyor…</EmptyState></AppShell>;
  if (!exams.length) return <AppShell title="Eksik Analizi"><EmptyState>Henüz imtihan yapılmadı.</EmptyState></AppShell>;

  const course = courses.find((c) => c.id === selected);
  const courseScores = course ? scores.filter((s) => s.course_id === course.id) : [];
  const title = periodLabel(activePeriod, exams);

  async function downloadPdf() {
    if (!course) return;
    if (!courseScores.length) { toast.error("Bu dönem için sonuç yok."); return; }
    const { courseAnalysisPdf, savePdf } = await import("@/lib/pdf");
    const doc = await courseAnalysisPdf(region ?? "", title, analysisPdfInput(course.name, courseScores, studentMap));
    savePdf(doc, `eksik-analizi-${course.name}.pdf`);
  }

  return (
    <AppShell title="Eksik Analizi" actions={<PeriodSelect exams={exams} value={activePeriod} onChange={setPeriod} />}>
      {courses.length > 1 || isAdmin ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {isAdmin && (
            <button
              onClick={() => setPick(REGION)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                selected === REGION ? "border-transparent bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
              )}
            >
              Mıntıka geneli
            </button>
          )}
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setPick(c.id)}
              style={courseColorVar(ids, c.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                selected === c.id ? "course-tint border-transparent course-text" : "bg-card hover:bg-secondary",
              )}
            >
              <span className="course-dot size-2 rounded-full" />
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mb-4 text-sm font-medium text-muted-foreground">{title}</p>

      {selected === REGION && isAdmin ? (
        <RegionView scores={scores} courses={courses} ids={ids} />
      ) : course ? (
        <CourseView
          name={course.name}
          style={courseColorVar(ids, course.id)}
          scores={courseScores}
          studentMap={studentMap}
          onPdf={downloadPdf}
        />
      ) : (
        <EmptyState>Kurs bulunamadı.</EmptyState>
      )}
    </AppShell>
  );
}

function RegionView({ scores, courses, ids }: { scores: ReturnType<typeof studentScores>; courses: { id: string; name: string }[]; ids: string[] }) {
  const reg = analyzeRegion(scores);
  if (!scores.length) return <EmptyState>Bu dönem için sonuç yok.</EmptyState>;
  const perCourse = courses
    .map((c) => ({ c, a: analyzeGroup(scores.filter((s) => s.course_id === c.id)) }))
    .filter((x) => x.a.studentCount);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">En başarılı bölüm</p>
          <p className="mt-1 font-display text-2xl font-semibold">{reg.best?.label ?? "—"}</p>
          {reg.best && <p className="text-sm">Ortalama <b>{fmt(reg.best.average)}</b></p>}
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">En zayıf bölüm</p>
          <p className="mt-1 font-display text-2xl font-semibold">{reg.worst?.label ?? "—"}</p>
          {reg.worst && <p className="text-sm">Ortalama <b>{fmt(reg.worst.average)}</b></p>}
        </Card>
        <Card className="bg-gold-soft p-5">
          <p className="text-sm text-muted-foreground">Geliştirilmesi gereken alan</p>
          <p className="mt-1 font-display text-2xl font-semibold">{reg.improve ?? "—"}</p>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Mıntıka bölüm ortalamaları</h2>
        <SectionBars sections={reg.sections} />
        <p className="mt-4 text-xs text-muted-foreground">Her kurs eşit sayılır; kalabalık kurslar sonucu tek başına belirlemez.</p>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Kurs</th>
              <th className="px-2 py-3 text-center">Kıraat</th>
              <th className="px-2 py-3 text-center">Ezber</th>
              <th className="px-2 py-3 text-center">İlmihal</th>
              <th className="px-2 py-3 text-center">Siyer</th>
              <th className="px-4 py-3">Eksik alanlar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {perCourse.map(({ c, a }) => (
              <tr key={c.id} style={courseColorVar(ids, c.id)}>
                <td className="px-4 py-3 font-semibold"><span className="course-dot mr-2 inline-block size-2 rounded-full" />{c.name}</td>
                {a.sections.map((s) => (
                  <td key={s.key} className="px-2 text-center"><span className={cn("rounded-md px-2 py-0.5 font-semibold", LEVEL_STYLE[s.level].chip)}>{fmt(s.average)}</span></td>
                ))}
                <td className="px-4 text-muted-foreground">{a.weakAreas.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CourseView({ name, style, scores, studentMap, onPdf }: {
  name: string;
  style: React.CSSProperties;
  scores: ReturnType<typeof studentScores>;
  studentMap: Map<string, { first_name: string; last_name: string }>;
  onPdf: () => void;
}) {
  const a = analyzeGroup(scores);
  const ranked = denseRank(scores, (s) => s.total);
  return (
    <div className="space-y-6">
      <Card className="course-stripe overflow-hidden" style={style}>
        <div className="course-tint flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-display text-2xl font-semibold">{trUpper(name)}</p>
            <p className="text-sm text-muted-foreground">{a.studentCount} öğrenci • Genel ortalama <b>{fmt(a.overall)}</b></p>
          </div>
          <Button variant="outline" onClick={onPdf}><FileDown /> Raporu PDF indir</Button>
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Bölüm başarıları</h2>
            {a.studentCount ? <SectionBars sections={a.sections} /> : <p className="text-muted-foreground">Bu dönem için sonuç yok.</p>}
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Tecvid</h2>
                <LevelChip level={a.tecvid.level} text={a.tecvid.label} />
              </div>
              {a.tecvid.topRules.length ? (
                <ul className="divide-y rounded-xl border">
                  {a.tecvid.topRules.map((r) => (
                    <li key={r.name} className="flex items-center justify-between px-3 py-2">
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-sm text-muted-foreground">{r.count} hata • {r.students} öğrenci</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Tecvid hatası kaydedilmedi.</p>
              )}
            </div>
            <div className="rounded-xl bg-gold-soft p-4">
              <p className="mb-1 text-sm font-bold uppercase tracking-wide text-accent-foreground">Otomatik rapor</p>
              <p>{a.summary}</p>
            </div>
          </div>
        </div>
      </Card>

      {ranked.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Öğrenci bazında eksikler</h2>
          <Card className="divide-y">
            {ranked.map((s) => {
              const st = studentMap.get(s.student_id);
              const sa = analyzeStudent(s);
              const errs = [...sa.tecvidRules, ...sa.otherErrors];
              return (
                <div key={s.student_id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  <RankBadge rank={s.rank} />
                  <div className="min-w-0 flex-1">
                    <p className="student-name">{st ? fullName(st) : ""}</p>
                    <p className="text-sm">
                      {sa.weakSections.length ? (
                        <>Geliştirilmesi gereken: <b>{sa.weakSections.join(", ")}</b></>
                      ) : (
                        <span className="text-success">Bütün bölümlerde 70 ve üzeri</span>
                      )}
                    </p>
                    {errs.length > 0 && <p className="text-sm text-muted-foreground">Hatalar: {errs.map(errorText).join(", ")}</p>}
                  </div>
                  <span className="text-xl font-extrabold">{fmt(s.total)}</span>
                </div>
              );
            })}
          </Card>
        </section>
      )}
    </div>
  );
}
