import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { examLabel } from "@/lib/format";
import type { Exam, Period } from "@/lib/scoring";

export const periodKey = (p: Period | null) => (!p ? "" : p.kind === "month" ? `m:${p.examId}` : `y:${p.year}`);
export const parsePeriod = (v: string): Period | null => {
  if (v.startsWith("m:")) return { kind: "month", examId: v.slice(2) };
  if (v.startsWith("y:")) return { kind: "year", year: Number(v.slice(2)) };
  return null;
};

/** Latest month first. */
export function defaultPeriod(exams: Exam[]): Period | null {
  const sorted = [...exams].sort((a, b) => b.exam_year - a.exam_year || b.exam_month - a.exam_month);
  return sorted[0] ? { kind: "month", examId: sorted[0].id } : null;
}

export function periodLabel(p: Period | null, exams: Exam[]) {
  if (!p) return "";
  if (p.kind === "year") return `${p.year} Yılı`;
  const e = exams.find((x) => x.id === p.examId);
  return e ? `${examLabel(e)} İmtihanı` : "";
}

export function PeriodSelect({ exams, value, onChange }: { exams: Exam[]; value: Period | null; onChange: (p: Period) => void }) {
  const sorted = [...exams].sort((a, b) => b.exam_year - a.exam_year || b.exam_month - a.exam_month);
  const years = [...new Set(sorted.map((e) => e.exam_year))];
  return (
    <Select value={periodKey(value)} onValueChange={(v) => { const p = parsePeriod(v); if (p) onChange(p); }}>
      <SelectTrigger className="h-10 w-[220px] bg-card">
        <SelectValue placeholder="Dönem seçin" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Aylık</SelectLabel>
          {sorted.map((e) => (
            <SelectItem key={e.id} value={`m:${e.id}`}>{examLabel(e)}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Yıllık (Ocak–Aralık)</SelectLabel>
          {years.map((y) => (
            <SelectItem key={y} value={`y:${y}`}>{y} Yılı</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
