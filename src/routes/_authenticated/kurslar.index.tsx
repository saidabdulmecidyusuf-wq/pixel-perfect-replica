import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Card, EmptyState, RankBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { defaultPeriod, periodLabel } from "@/components/PeriodSelect";
import { useRankings } from "@/components/RankingsView";
import { coursesQuery, rankingsQuery } from "@/lib/data";
import { courseColorVar, fmt, trUpper } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/kurslar/")({
  head: () => ({
    meta: [
      { title: "Kurslar — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Mıntıkadaki kurslar, öğrenci sayıları ve başarı ortalamaları." },
      { property: "og:title", content: "Kurslar — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Mıntıkadaki kurslar, öğrenci sayıları ve başarı ortalamaları." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const qc = useQueryClient();
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: rk } = useQuery(rankingsQuery);
  const period = rk ? defaultPeriod(rk.exams) : null;
  const r = useRankings(rk ?? { courses: [], students: [], exams: [], results: [] }, period);
  const [name, setName] = useState("");
  const ids = courses.map((c) => c.id);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("courses").insert({ name: name.trim() });
    if (error) { toast.error("Kurs eklenemedi"); return; }
    setName("");
    toast.success("Kurs eklendi");
    qc.invalidateQueries();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error("Kurs silinemedi"); return; }
    toast.success("Kurs silindi");
    qc.invalidateQueries();
  }

  return (
    <AppShell title="Kurslar">
      <form onSubmit={add} className="mb-6 flex gap-2 rounded-2xl border bg-card p-3 shadow-card">
        <Input placeholder="Yeni kurs adı (ör. Bole Kursu)" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" maxLength={80} />
        <Button type="submit" className="h-11"><Plus /> Kurs ekle</Button>
      </form>

      {period && <p className="mb-3 text-sm text-muted-foreground">Sıra ve ortalama: {periodLabel(period, rk?.exams ?? [])}</p>}

      {courses.length === 0 ? (
        <EmptyState>Henüz kurs yok. Yukarıdan ilk kursu ekleyin.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => {
            const st = r.courses.find((x) => x.course_id === c.id);
            const count = rk?.students.filter((s) => s.course_id === c.id).length ?? 0;
            return (
              <Card key={c.id} className="course-stripe flex items-center gap-4 p-5" style={courseColorVar(ids, c.id)}>
                {st ? <RankBadge rank={st.rank} /> : <span className="course-dot size-9 shrink-0 rounded-full opacity-25" />}
                <Link to="/kurslar/$courseId" params={{ courseId: c.id }} className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-semibold hover:underline">{trUpper(c.name)}</p>
                  <p className="text-sm text-muted-foreground">{count} öğrenci{st ? ` • Ortalama ${fmt(st.average)}` : ""}</p>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Kursu sil" className="text-destructive hover:bg-destructive-soft hover:text-destructive"><Trash2 /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{c.name} silinsin mi?</AlertDialogTitle>
                      <AlertDialogDescription>Kursun öğrencileri ve bütün imtihan sonuçları da silinir. Bu işlem geri alınamaz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
