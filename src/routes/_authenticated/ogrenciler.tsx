import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell, Card, EmptyState } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { AddStudentForm, StudentRow, sortStudents } from "@/components/StudentManager";
import { coursesQuery, studentsQuery } from "@/lib/data";
import { courseColorVar, fullName, trUpper } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ogrenciler")({
  head: () => ({
    meta: [
      { title: "Öğrenciler — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Kurslara göre öğrenci listesi; ekleme, silme ve isim değiştirme." },
      { property: "og:title", content: "Öğrenciler — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Kurslara göre öğrenci listesi; ekleme, silme ve isim değiştirme." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: students = [] } = useQuery(studentsQuery);
  const [q, setQ] = useState("");
  const ids = courses.map((c) => c.id);
  const needle = q.trim().toLocaleLowerCase("tr");
  const filtered = needle ? students.filter((s) => fullName(s).toLocaleLowerCase("tr").includes(needle)) : students;

  return (
    <AppShell title="Öğrenciler" actions={<span className="text-sm text-muted-foreground">{students.length} öğrenci</span>}>
      {courses.length === 0 ? (
        <EmptyState>Önce Kurslar sayfasından kurs ekleyin.</EmptyState>
      ) : (
        <>
          <AddStudentForm courses={courses} />
          <div className="relative my-6 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ara" className="h-10 bg-card pl-9" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {courses.map((c) => {
              const list = sortStudents(filtered.filter((s) => s.course_id === c.id));
              if (needle && !list.length) return null;
              return (
                <Card key={c.id} className="course-stripe overflow-hidden" style={courseColorVar(ids, c.id)}>
                  <div className="course-tint flex items-center justify-between px-4 py-3">
                    <p className="font-display text-lg font-semibold course-text">{trUpper(c.name)}</p>
                    <span className="text-sm text-muted-foreground">{list.length}</span>
                  </div>
                  <div className="divide-y">
                    {list.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">Öğrenci yok.</p>}
                    {list.map((s) => <StudentRow key={s.id} student={s} editable />)}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}
