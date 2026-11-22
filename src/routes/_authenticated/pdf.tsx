import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmptyState } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/pdf")({
  head: () => ({
    meta: [
      { title: "PDF — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "PDF bölümü." },
      { property: "og:title", content: "PDF — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "PDF bölümü." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

// Not finished yet: this section is still being built.
function Page() {
  return (
    <AppShell title="PDF">
      <EmptyState>Bu bölüm henüz hazır değil.</EmptyState>
    </AppShell>
  );
}
