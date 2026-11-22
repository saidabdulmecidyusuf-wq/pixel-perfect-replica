import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFirstAdmin, getRegionName, getSetupStatus } from "@/lib/app.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Giriş — Mıntıka İmtihan Sistemi" },
      { name: "description", content: "Yönetici ve kurs sorumlusu girişi." },
      { property: "og:title", content: "Giriş — Mıntıka İmtihan Sistemi" },
      { property: "og:description", content: "Yönetici ve kurs sorumlusu girişi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const setup = useQuery({ queryKey: ["setup"], queryFn: () => getSetupStatus() });
  const region = useQuery({ queryKey: ["region-name"], queryFn: () => getRegionName() });
  const createAdmin = useServerFn(createFirstAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const needsSetup = setup.data?.needsSetup;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (needsSetup) {
        const res = await createAdmin({ data: { email, password } });
        if (!res.ok) {
          toast.error(res.error);
          setup.refetch();
          return;
        }
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("E-posta veya şifre hatalı.");
        return;
      }
      navigate({ to: "/panel" });
    } catch {
      toast.error("Bir sorun oluştu, tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-hero hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">{region.data ?? ""}</p>
        <div>
          <h1 className="font-display text-5xl font-semibold leading-tight">İmtihan ve<br />Sıralama Sistemi</h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">Kıraat, Ezber, İlmihal ve Siyer-i Nebi imtihanları; aylık ve yıllık sıralamalar.</p>
        </div>
        <p className="text-sm text-primary-foreground/60">Kurslar • Öğrenciler • İmtihanlar • Sıralamalar</p>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{region.data ?? ""}</p>
            <p className="font-display text-3xl font-semibold">İmtihan ve Sıralama</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{needsSetup ? "Yönetici hesabı oluştur" : "Giriş yap"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {needsSetup
                ? "İlk kurulum: bu hesap bütün kursları ve puanları yönetir."
                : "Yönetici veya kurs sorumlusu hesabınızla girin."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input id="password" type="password" required minLength={needsSetup ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            {needsSetup && <p className="text-xs text-muted-foreground">En az 8 karakter.</p>}
          </div>
          <Button type="submit" className="h-11 w-full text-base" disabled={busy || setup.isLoading}>
            {busy ? "Lütfen bekleyin…" : needsSetup ? "Hesabı oluştur ve gir" : "Giriş yap"}
          </Button>
        </form>
      </div>
    </div>
  );
}
