import { useQuery } from "@tanstack/react-query";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { settingsQuery } from "@/lib/data";

export function ShareDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { data } = useQuery(settingsQuery);
  const url = data?.share_token && typeof window !== "undefined" ? `${window.location.origin}/s/${data.share_token}` : "";
  const text = `${data?.region_name ?? ""} imtihan sıralaması: ${url}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default"><Share2 /> Sıralamayı Paylaş</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sıralamayı Paylaş</DialogTitle>
          <DialogDescription>
            Bu bağlantıyı açan herkes sıralamaları görür, kimse puan değiştiremez. Yeni puanlar girildikçe sayfa güncellenir.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              toast.success("Bağlantı kopyalandı");
            }}
          >
            <Copy /> Kopyala
          </Button>
        </div>
        <Button asChild variant="success" className="h-11">
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
            <MessageCircle /> WhatsApp ile gönder
          </a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
