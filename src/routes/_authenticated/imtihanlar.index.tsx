import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarPlus, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Card, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { examsQuery, rankingsQuery } from "@/lib/data";
import { MONTHS_TR, examLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/imtihanlar/")({
  head: () => ({
    meta: [
      { title: "İmtihanlar — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Aylık imtihanlar ve puan girişi." },
      { property: "og:title", content: "İmtihanlar — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Aylık imtihanlar ve puan girişi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExamsPage,
});

function ExamsPage() {
  const qc = useQueryClient();
  const { data: exams = [] } = useQuery(examsQuery);
  const { data: rk } = useQuery(rankingsQuery);
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  async function create() {
    const { error } = await supabase.from("exams").insert({ exam_month: Number(month), exam_year: Number(year) });
    if (error) return toast.error(error.code === "23505" ? "Bu ay için imtihan zaten var." : "İmtihan oluşturulamadı");
    toast.success("İmtihan oluşturuldu");
    qc.invalidateQueries();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) return toast.error("Silinemedi");
    toast.success("İmtihan silindi");
    qc.invalidateQueries();
  }

  return (
    <AppShell title="İmtihanlar">
      <Card className="mb-6 flex flex-wrap items-center gap-2 p-3">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS_TR.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-11 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Button className="h-11" onClick={create}><CalendarPlus /> Yeni aylık imtihan</Button>
      </Card>

      {exams.length === 0 ? (
        <EmptyState>Henüz imtihan yok. Yukarıdan ay seçip ilk imtihanı oluşturun.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((e) => {
            const count = rk?.results.filter((r) => r.exam_id === e.id).length ?? 0;
            return (
              <Card key={e.id} className="flex items-center gap-2 p-2 pl-5">
                <Link to="/imtihanlar/$examId" params={{ examId: e.id }} className="flex min-w-0 flex-1 items-center justify-between py-2">
                  <div>
                    <p className="font-display text-xl font-semibold">{examLabel(e)}</p>
                    <p className="text-sm text-muted-foreground">{count} öğrenci puanlandı</p>
                  </div>
                  <ChevronRight className="text-muted-foreground" />
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="İmtihanı sil" className="text-destructive hover:bg-destructive-soft hover:text-destructive"><Trash2 /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{examLabel(e)} imtihanı silinsin mi?</AlertDialogTitle>
                      <AlertDialogDescription>Bu ayın bütün puanları silinir. Bu işlem geri alınamaz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(e.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
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
