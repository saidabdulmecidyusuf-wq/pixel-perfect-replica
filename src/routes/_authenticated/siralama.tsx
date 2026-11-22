import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, EmptyState } from "@/components/AppShell";
import { RankingsView } from "@/components/RankingsView";
import { ShareDialog } from "@/components/ShareDialog";
import { rankingsQuery, useMe } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/siralama")({
  head: () => ({
    meta: [
      { title: "Sıralama — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Kurs sıralaması, genel ve kurs içi öğrenci sıralaması." },
      { property: "og:title", content: "Sıralama — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Kurs sıralaması, genel ve kurs içi öğrenci sıralaması." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RankingPage,
});

function RankingPage() {
  const { data: me } = useMe();
  const { data, isLoading } = useQuery(rankingsQuery);
  return (
    <AppShell title="Sıralama" actions={me?.isAdmin ? <ShareDialog /> : null}>
      {isLoading || !data ? <EmptyState>Yükleniyor…</EmptyState> : <RankingsView data={data} initialCourseId={me?.courseId ?? null} />}
    </AppShell>
  );
}
