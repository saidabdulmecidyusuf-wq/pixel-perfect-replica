import type { CSSProperties } from "react";

export const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export const monthName = (m: number) => MONTHS_TR[m - 1] ?? "";
export const examLabel = (e: { exam_year: number; exam_month: number }) =>
  `${monthName(e.exam_month)} ${e.exam_year}`;

const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
export const fmt = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? "—" : nf.format(n));

export const fullName = (s: { first_name: string; last_name: string }) =>
  `${s.first_name} ${s.last_name}`.trim();

export const trUpper = (s: string) => s.toLocaleUpperCase("tr-TR");

/** CSS variable for a course's identity color, stable by position in the course list. */
export function courseColorVar(courseIds: string[], courseId: string) {
  const i = Math.max(0, courseIds.indexOf(courseId));
  return { ["--course-color" as string]: `var(--course-${i % 10})` } as CSSProperties;
}

export function compareTr(a: string, b: string) {
  return a.localeCompare(b, "tr");
}
