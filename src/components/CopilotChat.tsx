import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery } from "@/lib/catalog";
import { CopilotProductReview } from "@/components/CopilotProductReview";
import { validateProduct, type ProductDraft } from "../../supabase/functions/_shared/product-draft";

type Message = { role: "user" | "assistant"; content: string };
async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-copilot", { body });
  if (error) {
    let detail = error.message;
    if (error.context instanceof Response) {
      try {
        const response = await error.context.json();
        detail = response.error || detail;
      } catch {
        /* non-JSON gateway error */
      }
    }
    throw new Error(detail);
  }
  if (!data || data.error) throw new Error(data?.error || "Respuesta vacía del copiloto.");
  return data;
}

export function CopilotChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [requestId, setRequestId] = useState("");
  const [publicationAttempted, setPublicationAttempted] = useState(false);
  const [failure, setFailure] = useState("");
  const busy = useRef(false);
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const prepare = useMutation({
    mutationFn: async (next: Message[]) => {
      const result = await invoke({ action: "prepare", messages: next.slice(-20), draft });
      if (typeof result.message !== "string") throw new Error("Respuesta no válida.");
      return {
        message: result.message,
        draft: result.draft ? validateProduct(result.draft) : null,
      };
    },
    onSuccess: (result) => {
      setMessages((prev) => [...prev, { role: "assistant", content: result.message }]);
      if (result.draft) {
        setDraft(result.draft);
        setRequestId(crypto.randomUUID());
      }
    },
    onError: (error: Error) => {
      setFailure(error.message);
      toast.error(error.message);
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const publish = useMutation({
    mutationFn: async () => {
      const result = await invoke({
        action: "publish",
        confirmed: true,
        requestId,
        draft: validateProduct(draft, true),
      });
      if (typeof result.productId !== "string")
        throw new Error("No se pudo confirmar la publicación. Reintenta sin modificar la ficha.");
      return result;
    },
    onSuccess: () => {
      toast.success("Producto publicado");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Producto publicado tras tu confirmación. Puedes consultarlo en el catálogo.",
        },
      ]);
      setDraft(null);
      setPublicationAttempted(false);
      setFailure("");
      for (const key of ["products", "product", "top-lists", "price-history"])
        void queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (error: Error) => {
      setFailure(error.message);
      toast.error(error.message);
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const pending = prepare.isPending || publish.isPending;
  function send() {
    if (!input.trim() || busy.current || publicationAttempted) return;
    busy.current = true;
    // Any new AI request invalidates the previous review confirmation.
    setRequestId(crypto.randomUUID());
    setFailure("");
    const next: Message[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    prepare.mutate(next);
  }
  function confirmPublication() {
    if (busy.current) return;
    busy.current = true;
    setPublicationAttempted(true);
    setFailure("");
    publish.mutate();
  }
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">Copiloto de IA</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Dame el nombre, enlace de Amazon, URL de imagen y los datos que conozcas. Prepararé una
        ficha para que la revises. No se publica nada desde el chat.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        No lee automáticamente Amazon. Copia aquí las características verificadas. El borrador se
        pierde al recargar.
      </p>
      <div aria-live="polite" className="my-4 max-h-80 space-y-3 overflow-auto">
        {messages.map((m, i) => (
          <p key={i} className="whitespace-pre-wrap text-sm">
            <strong>{m.role === "user" ? "Tú" : "Copiloto"}: </strong>
            {m.content}
          </p>
        ))}
        {pending && (
          <p role="status">{publish.isPending ? "Publicando…" : "Preparando propuesta…"}</p>
        )}
      </div>
      {failure && (
        <p role="alert" className="my-3 text-sm text-destructive">
          {failure}
        </p>
      )}
      <Textarea
        aria-label="Datos para el copiloto"
        maxLength={10000}
        rows={5}
        disabled={pending || publicationAttempted}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          "Nombre: …\nAmazon: …\nImagen: …\nPrecio EUR: …\nCaracterísticas verificadas: …"
        }
      />
      <Button
        className="mt-3"
        disabled={pending || publicationAttempted || !input.trim()}
        onClick={send}
      >
        Enviar al copiloto
      </Button>
      {draft && (
        <CopilotProductReview
          key={requestId}
          draft={draft}
          categories={categories}
          disabled={pending || publicationAttempted}
          onChange={setDraft}
          onPublish={confirmPublication}
          onDiscard={() => {
            setDraft(null);
            setFailure("");
          }}
        />
      )}
      {publicationAttempted && !publish.isPending && (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            No se ha recibido confirmación. La ficha queda bloqueada para evitar duplicados;
            reintentar usa el mismo identificador. Si el error es un slug existente, descarta y
            prepara otra ficha.
          </p>
          <Button onClick={confirmPublication}>Reintentar publicación confirmada</Button>
          <Button
            className="ml-2"
            variant="outline"
            onClick={() => {
              setDraft(null);
              setPublicationAttempted(false);
              setMessages([]);
              setFailure("");
            }}
          >
            Cerrar propuesta (comprueba antes el catálogo)
          </Button>
        </div>
      )}
    </section>
  );
}
