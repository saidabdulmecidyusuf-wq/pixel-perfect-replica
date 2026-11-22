import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getSharedRankings } from "@/lib/app.functions";
import { RankingsView } from "@/components/RankingsView";

const sharedQuery = (token: string) =>
  queryOptions({
    queryKey: ["shared", token],
    queryFn: () => getSharedRankings({ data: { token } }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

export const Route = createFileRoute("/s/$token")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(sharedQuery(params.token)),
  head: ({ loaderData }) => {
    const region = loaderData?.ok ? loaderData.data.regionName : "Mıntıka";
    const title = `${region} — İmtihan Sıralaması`;
    const description = "Kurs sıralaması, genel öğrenci sıralaması ve her kursun kendi sıralaması.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: SharedPage,
});

function SharedPage() {
  const { token } = Route.useParams();
  const { data } = useSuspenseQuery(sharedQuery(token));

  if (!data.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Bağlantı geçersiz</h1>
          <p className="mt-2 text-muted-foreground">Bu sıralama bağlantısı artık kullanılmıyor. Yeni bağlantıyı yöneticiden isteyin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{data.data.regionName}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">İmtihan Sıralaması</h1>
          <p className="mt-2 text-sm text-primary-foreground/75">Sadece görüntüleme. Yeni puanlar girildikçe otomatik güncellenir.</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <RankingsView data={data.data} />
      </main>
    </div>
  );
}
