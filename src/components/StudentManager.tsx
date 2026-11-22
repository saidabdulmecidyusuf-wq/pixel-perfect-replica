import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { compareTr, fullName } from "@/lib/format";
import type { Course, Student } from "@/lib/scoring";

/** Normalise "aHMET" → "Ahmet" so names look tidy everywhere. */
export function tidyName(s: string) {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR") : w))
    .join(" ");
}

export function AddStudentForm({ courses, fixedCourseId }: { courses: Course[]; fixedCourseId?: string }) {
  const qc = useQueryClient();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [courseId, setCourseId] = useState(fixedCourseId ?? "");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!first.trim() || !courseId) return;
    setBusy(true);
    const { error } = await supabase.from("students").insert({ first_name: tidyName(first), last_name: tidyName(last), course_id: courseId });
    setBusy(false);
    if (error) return toast.error("Öğrenci eklenemedi");
    setFirst("");
    setLast("");
    toast.success("Öğrenci eklendi");
    qc.invalidateQueries();
  }

  return (
    <form onSubmit={add} className="flex flex-wrap gap-2 rounded-2xl border bg-card p-3 shadow-card">
      <Input placeholder="Adı" value={first} onChange={(e) => setFirst(e.target.value)} className="h-11 min-w-36 flex-1 text-base" required maxLength={60} />
      <Input placeholder="Soyadı" value={last} onChange={(e) => setLast(e.target.value)} className="h-11 min-w-36 flex-1 text-base" maxLength={60} />
      {!fixedCourseId && (
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="h-11 min-w-44 flex-1"><SelectValue placeholder="Kurs seçin" /></SelectTrigger>
          <SelectContent>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Button type="submit" className="h-11" disabled={busy || !courseId}><Plus /> Öğrenci ekle</Button>
    </form>
  );
}

export function StudentRow({ student, editable, right }: { student: Student; editable: boolean; right?: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(student.first_name);
  const [last, setLast] = useState(student.last_name);

  async function save() {
    const { error } = await supabase.from("students").update({ first_name: tidyName(first), last_name: tidyName(last) }).eq("id", student.id);
    if (error) return toast.error("Kaydedilemedi");
    setOpen(false);
    toast.success("İsim güncellendi");
    qc.invalidateQueries();
  }

  async function remove() {
    const { error } = await supabase.from("students").delete().eq("id", student.id);
    if (error) return toast.error("Silinemedi");
    toast.success("Öğrenci silindi");
    qc.invalidateQueries();
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <p className="student-name min-w-0 flex-1 truncate">{fullName(student)}</p>
      {right}
      {editable && (
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label="İsmi değiştir" onClick={() => setOpen(true)}><Pencil /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Öğrenciyi sil" className="text-destructive hover:bg-destructive-soft hover:text-destructive"><Trash2 /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{fullName(student)} silinsin mi?</AlertDialogTitle>
                <AlertDialogDescription>Öğrencinin bütün imtihan sonuçları da silinir. Bu işlem geri alınamaz.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>İsmi değiştir</DialogTitle></DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Adı" className="h-11 text-base" />
            <Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Soyadı" className="h-11 text-base" />
          </div>
          <DialogFooter><Button onClick={save} disabled={!first.trim()}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const sortStudents = <T extends Student>(list: T[]) =>
  [...list].sort((a, b) => compareTr(fullName(a), fullName(b)));
