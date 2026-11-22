import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, EmptyState, RankBadge } from "@/components/AppShell";
import { PeriodSelect, defaultPeriod, periodLabel } from "@/components/PeriodSelect";
import { courseColorVar, fmt, fullName, trUpper } from "@/lib/format";
import { rankCourses, rankStudents, studentScores, type Course, type Exam, type Period, type ResultRow, type Student } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export interface RankingsInput {
  courses: Course[];
  students: Student[];
  exams: Exam[];
  results: ResultRow[];
}

export function useRankings(data: RankingsInput, period: Period | null) {
  return useMemo(() => {
    const courseIds = data.courses.map((c) => c.id);
    const courseName = new Map(data.courses.map((c) => [c.id, c.name]));
    const studentMap = new Map(data.students.map((s) => [s.id, s]));
    if (!period) return { courseIds, courseName, studentMap, scores: [], general: [], courses: [], perCourse: new Map() };
    const scores = studentScores(data.results, data.exams, period).filter((s) => studentMap.has(s.student_id));
    const general = rankStudents(scores);
    const courses = rankCourses(scores).filter((c) => courseName.has(c.course_id));
    const perCourse = new Map(data.courses.map((c) => [c.id, rankStudents(scores, c.id)]));
    return { courseIds, courseName, studentMap, scores, general, courses, perCourse };
  }, [data, period]);
}

export function RankingsView({ data, initialCourseId }: { data: RankingsInput; initialCourseId?: string | null }) {
  const [period, setPeriod] = useState<Period | null>(() => defaultPeriod(data.exams));
  const [courseTab, setCourseTab] = useState<string | null>(initialCourseId ?? data.courses[0]?.id ?? null);
  const [q, setQ] = useState("");
  const r = useRankings(data, period);

  const courseRankOf = (studentId: string, courseId: string) =>
    r.perCourse.get(courseId)?.find((x: { student_id: string }) => x.student_id === studentId)?.rank;

  const found = q.trim().length >= 2
    ? r.general.filter((g) => {
        const s = r.studentMap.get(g.student_id);
        return s && fullName(s).toLocaleLowerCase("tr").includes(q.trim().toLocaleLowerCase("tr"));
      })
    : [];

  if (!data.exams.length) return <EmptyState>Henüz imtihan yapılmadı.</EmptyState>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSelect exams={data.exams} value={period} onChange={setPeriod} />
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci adı ile sıranı bul" className="h-10 bg-card pl-9" />
        </div>
      </div>

      {found.length > 0 && (
        <Card className="divide-y">
          {found.slice(0, 8).map((g) => {
            const s = r.studentMap.get(g.student_id)!;
            return (
              <div key={g.student_id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3" style={courseColorVar(r.courseIds, g.course_id)}>
                <span className="student-name min-w-40 flex-1">{fullName(s)}</span>
                <span className="text-sm font-semibold course-text">{r.courseName.get(g.course_id)}</span>
                <span className="text-sm">Genel: <b>{g.rank}.</b></span>
                <span className="text-sm">Kurs içi: <b>{courseRankOf(g.student_id, g.course_id)}.</b></span>
                <span className="text-sm">Puan: <b>{fmt(g.total)}</b></span>
              </div>
            );
          })}
        </Card>
      )}

      <p className="text-sm font-medium text-muted-foreground">{periodLabel(period, data.exams)}</p>

      <Tabs defaultValue="courses">
        <TabsList className="h-auto flex-wrap bg-secondary p-1">
          <TabsTrigger value="courses" className="px-4 py-2">Kurs Sıralaması</TabsTrigger>
          <TabsTrigger value="general" className="px-4 py-2">Genel Öğrenci Sıralaması</TabsTrigger>
          <TabsTrigger value="incourse" className="px-4 py-2">Kurs İçi Sıralama</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4 space-y-3">
          {r.courses.length === 0 && <EmptyState>Bu dönem için sonuç yok.</EmptyState>}
          {r.courses.map((c) => (
            <Card key={c.course_id} className="course-stripe flex items-center gap-4 px-4 py-4 sm:px-5" style={courseColorVar(r.courseIds, c.course_id)}>
              <RankBadge rank={c.rank} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold">{trUpper(r.courseName.get(c.course_id) ?? "")}</p>
                <p className="text-sm text-muted-foreground">{c.studentCount} öğrenci</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-primary">{fmt(c.average)}</p>
                <p className="text-xs text-muted-foreground">{c.gapToFirst > 0 ? `Birinciyle fark: −${fmt(c.gapToFirst)}` : "Birinci"}</p>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="general" className="mt-4">
          {r.general.length === 0 ? (
            <EmptyState>Bu dönem için sonuç yok.</EmptyState>
          ) : (
            <Card className="divide-y overflow-hidden">
              {r.general.map((g) => {
                const s = r.studentMap.get(g.student_id)!;
                return (
                  <div key={g.student_id} className="flex items-center gap-3 px-4 py-3" style={courseColorVar(r.courseIds, g.course_id)}>
                    <RankBadge rank={g.rank} />
                    <div className="min-w-0 flex-1">
                      <p className="student-name truncate">{fullName(s)}</p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span className="course-dot inline-block size-2 rounded-full" />
                        {r.courseName.get(g.course_id)}
                      </p>
                    </div>
                    <span className="text-xl font-extrabold">{fmt(g.total)}</span>
                  </div>
                );
              })}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="incourse" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {data.courses.map((c) => (
              <button
                key={c.id}
                onClick={() => setCourseTab(c.id)}
                style={courseColorVar(r.courseIds, c.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  courseTab === c.id ? "course-tint border-transparent course-text" : "bg-card hover:bg-secondary",
                )}
              >
                <span className="course-dot size-2 rounded-full" />
                {c.name}
              </button>
            ))}
          </div>
          {courseTab && (() => {
            const rows = r.perCourse.get(courseTab) ?? [];
            const standing = r.courses.find((c) => c.course_id === courseTab);
            return (
              <Card className="course-stripe overflow-hidden" style={courseColorVar(r.courseIds, courseTab)}>
                <div className="course-tint flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                  <p className="font-display text-xl font-semibold">{trUpper(r.courseName.get(courseTab) ?? "")}</p>
                  {standing && (
                    <p className="text-sm">
                      Kurs sırası <b>{standing.rank}.</b> • Ortalama <b>{fmt(standing.average)}</b>
                      {standing.gapToFirst > 0 && <> • Birinciyle fark <b>−{fmt(standing.gapToFirst)}</b></>}
                    </p>
                  )}
                </div>
                {rows.length === 0 ? (
                  <p className="px-5 py-8 text-center text-muted-foreground">Bu dönem için sonuç yok.</p>
                ) : (
                  <div className="divide-y">
                    {rows.map((g: { student_id: string; rank: number; total: number }) => {
                      const s = r.studentMap.get(g.student_id)!;
                      const gen = r.general.find((x) => x.student_id === g.student_id);
                      return (
                        <div key={g.student_id} className="flex items-center gap-3 px-5 py-3">
                          <RankBadge rank={g.rank} />
                          <div className="min-w-0 flex-1">
                            <p className="student-name truncate">{fullName(s)}</p>
                            {gen && <p className="text-sm text-muted-foreground">Genel sıra: {gen.rank}.</p>}
                          </div>
                          <span className="text-xl font-extrabold">{fmt(g.total)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
