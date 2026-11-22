import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Card, EmptyState, RankBadge } from "@/components/AppShell";
import { PeriodSelect, defaultPeriod, periodLabel } from "@/components/PeriodSelect";
import { useRankings } from "@/components/RankingsView";
import { AddStudentForm, StudentRow, sortStudents } from "@/components/StudentManager";
import { coursesQuery, examsQuery, rankingsQuery, resultsQuery, studentsQuery, useMe } from "@/lib/data";
import { courseColorVar, fmt, fullName, trUpper } from "@/lib/format";
import type { Period } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/kurslar/$courseId")({
  head: () => ({
    meta: [
      { title: "Kurs — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Kursun öğrencileri, imtihan sonuçları, ortalaması ve sırası." },
      { property: "og:title", content: "Kurs — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Kursun öğrencileri, imtihan sonuçları, ortalaması ve sırası." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const { data: me } = useMe();
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: students = [] } = useQuery(studentsQuery);
  const { data: exams = [] } = useQuery(examsQuery);
  const { data: results = [] } = useQuery(resultsQuery);
  const { data: rk } = useQuery(rankingsQuery);
  const [period, setPeriod] = useState<Period | null>(null);
  const activePeriod = period ?? defaultPeriod(exams);
  // Course rank needs every course → use the ranking data; section scores come from own results.
  const all = useRankings(rk ?? { courses: [], students: [], exams: [], results: [] }, activePeriod);
  const own = useRankings({ courses, students, exams, results }, activePeriod);

  const course = courses.find((c) => c.id === courseId);
  const list = sortStudents(students.filter((s) => s.course_id === courseId));
  const standing = all.courses.find((c) => c.course_id === courseId);
  const ranked = own.perCourse.get(courseId) ?? [];
  const isAdmin = !!me?.isAdmin;

  if (!course) return <AppShell><EmptyState>Kurs bulunamadı.</EmptyState></AppShell>;

  return (
    <AppShell>
      <Card className="course-stripe mb-6 overflow-hidden" style={courseColorVar(all.courseIds.length ? all.courseIds : courses.map((c) => c.id), courseId)}>
        <div className="course-tint flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            {isAdmin && <Link to="/kurslar" className="text-sm text-muted-foreground hover:underline">← Kurslar</Link>}
            <h1 className="font-display text-3xl font-semibold">{trUpper(course.name)}</h1>
            <p className="text-muted-foreground">{list.length} öğrenci</p>
          </div>
          {standing && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Başarı ortalaması</p>
                <p className="text-3xl font-extrabold text-primary">{fmt(standing.average)}</p>
                <p className="text-xs text-muted-foreground">{standing.gapToFirst > 0 ? `Birinciyle fark −${fmt(standing.gapToFirst)}` : "Mıntıka birincisi"}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Genel sıra</p>
                <RankBadge rank={standing.rank} />
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-2">
          <h2 className="text-xl font-semibold">Öğrenciler</h2>
          {isAdmin && <AddStudentForm courses={courses} fixedCourseId={courseId} />}
          {list.length === 0 ? (
            <EmptyState>Bu kursta öğrenci yok.</EmptyState>
          ) : (
            <Card className="divide-y">
              {list.map((s) => <StudentRow key={s.id} student={s} editable={isAdmin} />)}
            </Card>
          )}
        </section>

        <section className="space-y-3 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">İmtihan sonuçları</h2>
            {exams.length > 0 && <PeriodSelect exams={exams} value={activePeriod} onChange={setPeriod} />}
          </div>
          <p className="text-sm text-muted-foreground">{periodLabel(activePeriod, exams)}</p>
          {ranked.length === 0 ? (
            <EmptyState>Bu dönem için sonuç yok.</EmptyState>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Sıra</th>
                    <th className="px-3 py-3">Öğrenci</th>
                    <th className="px-2 py-3 text-center">Kıraat</th>
                    <th className="px-2 py-3 text-center">Ezber</th>
                    <th className="px-2 py-3 text-center">İlmihal</th>
                    <th className="px-2 py-3 text-center">Siyer</th>
                    <th className="px-3 py-3 text-center">Ortalama</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ranked.map((g) => {
                    const s = own.studentMap.get(g.student_id)!;
                    return (
                      <tr key={g.student_id}>
                        <td className="px-3 py-2.5"><RankBadge rank={g.rank} /></td>
                        <td className="px-3 py-2.5"><span className="student-name">{fullName(s)}</span></td>
                        <td className="px-2 text-center">{fmt(g.kiraat)}</td>
                        <td className="px-2 text-center">{fmt(g.ezber)}</td>
                        <td className="px-2 text-center">{fmt(g.ilmihal)}</td>
                        <td className="px-2 text-center">{fmt(g.siyer)}</td>
                        <td className="px-3 text-center text-base font-extrabold">{fmt(g.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
