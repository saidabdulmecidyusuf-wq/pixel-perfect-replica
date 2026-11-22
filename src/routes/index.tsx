import { createFileRoute, redirect } from "@tanstack/react-router";

// The app lives behind sign-in; "/" forwards to the dashboard (which sends
// signed-out visitors to the sign-in page).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mıntıka İmtihan ve Sıralama Sistemi" },
      { name: "description", content: "Kurslar, öğrenciler, aylık imtihanlar ve sıralamalar tek yerde." },
      { property: "og:title", content: "Mıntıka İmtihan ve Sıralama Sistemi" },
      { property: "og:description", content: "Kurslar, öğrenciler, aylık imtihanlar ve sıralamalar tek yerde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/panel" });
  },
});
