import { createFileRoute, Link, type LinkProps } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, BookOpen, ClipboardList, FileDown, Medal, Share2, Trophy, Users, type LucideIcon } from "lucide-react";
import { AppShell, Card, RankBadge } from "@/components/AppShell";
import { ShareDialog } from "@/components/ShareDialog";
import { defaultPeriod, periodLabel } from "@/components/PeriodSelect";
import { useRankings } from "@/components/RankingsView";
import { rankingsQuery, useMe } from "@/lib/data";
import { courseColorVar, fmt, trUpper } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Ana Sayfa — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Kurslar, öğrenciler, imtihanlar ve sıralamalar." },
      { property: "og:title", content: "Ana Sayfa — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Kurslar, öğrenciler, imtihanlar ve sıralamalar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Panel,
});

function Tile({ to, icon: Icon, title, text }: { to: NonNullable<LinkProps["to"]>; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link to={to} className="group rounded-2xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </Link>
  );
}

function Panel() {
  const { data: me } = useMe();
  const { data } = useQuery(rankingsQuery);
  const empty = { courses: [], students: [], exams: [], results: [] };
  const period = data ? defaultPeriod(data.exams) : null;
  const r = useRankings(data ?? empty, period);
  const isAdmin = !!me?.isAdmin;
  const myStanding = me?.courseId ? r.courses.find((c) => c.course_id === me.courseId) : undefined;

  return (
    <AppShell>
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Kurs</p>
          <p className="mt-1 text-3xl font-extrabold">{data?.courses.length ?? "—"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Öğrenci</p>
          <p className="mt-1 text-3xl font-extrabold">{data?.students.length ?? "—"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Son imtihan</p>
          <p className="mt-1 font-display text-2xl font-semibold">{data && period ? periodLabel(period, data.exams).replace(" İmtihanı", "") : "—"}</p>
        </Card>
      </section>

      {!isAdmin && me?.courseId && (
        <Card className="course-stripe mb-8 p-5" style={courseColorVar(r.courseIds, me.courseId)}>
          <p className="text-sm text-muted-foreground">Kursunuz</p>
          <p className="font-display text-2xl font-semibold">{trUpper(r.courseName.get(me.courseId) ?? "")}</p>
          {myStanding ? (
            <p className="mt-2">Son imtihanda <b>{myStanding.rank}.</b> sırada • Ortalama <b>{fmt(myStanding.average)}</b>{myStanding.gapToFirst > 0 && <> • Birinciyle fark <b>−{fmt(myStanding.gapToFirst)}</b></>}</p>
          ) : (
            <p className="mt-2 text-muted-foreground">Son imtihan için sonuç yok.</p>
          )}
          <Link to="/kurslar/$courseId" params={{ courseId: me.courseId }} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Kursu ve öğrencileri gör →</Link>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin && <Tile to="/kurslar" icon={BookOpen} title="Kurslar" text="Kurs ekle, sil, başarı durumunu gör." />}
        {isAdmin && <Tile to="/ogrenciler" icon={Users} title="Öğrenciler" text="Öğrenci ekle, sil, isim değiştir." />}
        {isAdmin && <Tile to="/imtihanlar" icon={ClipboardList} title="İmtihanlar" text="Aylık imtihan oluştur, puan gir." />}
        <Tile to="/siralama" icon={Trophy} title="Öğrenci Sıralaması" text="Genel ve kurs içi sıralama." />
        <Tile to="/siralama" icon={Medal} title="Kurs Sıralaması" text="Kursların başarı ortalamaları." />
        <Tile to="/analiz" icon={BarChart3} title="Eksik Analizi" text="Bölüm bazında başarı raporu." />
        <Tile to="/pdf" icon={FileDown} title="PDF" text="Cetvel, sıralama ve rapor indir." />
        {isAdmin && (
          <ShareDialog
            trigger={
              <button className="group rounded-2xl border bg-hero p-5 text-left text-primary-foreground shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gold text-accent-foreground">
                  <Share2 className="size-5" />
                </span>
                <p className="mt-4 font-display text-lg font-semibold">Sıralamayı Paylaş</p>
                <p className="mt-1 text-sm text-primary-foreground/75">WhatsApp ile bağlantı gönder.</p>
              </button>
            }
          />
        )}
      </section>

      {r.courses.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">İlk 3 kurs — {periodLabel(period, data?.exams ?? [])}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {r.courses.slice(0, 3).map((c) => (
              <Card key={c.course_id} className="course-stripe flex items-center gap-3 p-4" style={courseColorVar(r.courseIds, c.course_id)}>
                <RankBadge rank={c.rank} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.courseName.get(c.course_id)}</p>
                  <p className="text-sm text-muted-foreground">Ortalama {fmt(c.average)}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
