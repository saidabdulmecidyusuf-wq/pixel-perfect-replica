import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmptyState } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/analiz")({
  head: () => ({
    meta: [
      { title: "Analiz — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Analiz bölümü." },
      { property: "og:title", content: "Analiz — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Analiz bölümü." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

// Not finished yet: this section is still being built.
function Page() {
  return (
    <AppShell title="Analiz">
      <EmptyState>Bu bölüm henüz hazır değil.</EmptyState>
    </AppShell>
  );
}
