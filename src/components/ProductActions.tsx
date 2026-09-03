import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BellRing, Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.href;
  const text = encodeURIComponent(`${title} — GadgetMatrix`);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Share2 className="size-4" /> Compartir:
      </span>
      <Button asChild variant="outline" size="sm">
        <a
          href={`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          X
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a
          href={`https://wa.me/?text=${text}%20${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </a>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          toast.success("Enlace copiado");
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
        Copiar
      </Button>
    </div>
  );
}

export function PriceAlert({ productId, price }: { productId: string; price: number | null }) {
  const { user } = useAuth();
  const [target, setTarget] = useState(price ? String(Math.floor(price * 0.9)) : "");

  const create = useMutation({
    mutationFn: async () => {
      const value = Number(target);
      if (!Number.isFinite(value) || value <= 0) throw new Error("precio no válido");
      const { error } = await supabase
        .from("price_alerts")
        .insert({ product_id: productId, target_price: value });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Te avisaremos cuando baje de ese precio."),
    onError: () => toast.error("No se pudo crear la alerta."),
  });

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <BellRing className="size-4 text-accent" /> Alerta de bajada de precio
      </p>
      {user ? (
        <div className="mt-3 flex gap-2">
          <Input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="decimal"
            placeholder="Precio objetivo (€)"
          />
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            Avisarme
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary hover:underline">
            Inicia sesión
          </Link>{" "}
          para recibir avisos cuando baje de precio.
        </p>
      )}
    </div>
  );
}
