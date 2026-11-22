import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmptyState } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/ayarlar")({
  head: () => ({
    meta: [
      { title: "Ayarlar — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Ayarlar bölümü." },
      { property: "og:title", content: "Ayarlar — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Ayarlar bölümü." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

// Not finished yet: this section is still being built.
function Page() {
  return (
    <AppShell title="Ayarlar">
      <EmptyState>Bu bölüm henüz hazır değil.</EmptyState>
    </AppShell>
  );
}
