import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  runAdminAgent,
  type AiMessage,
} from "@/lib/ai-admin.functions";

const SUGGESTIONS = [
  "Crea una lista Top con los 3 mejores gadgets para teletrabajo",
  "Escribe un artículo de blog sobre auriculares gaming inalámbricos",
  "Añade una categoría 'Teclados' y un teclado mecánico de ejemplo",
];

/**
 * Llama al copiloto. En local (npm run dev) usa la server function de
 * TanStack; en la web publicada (sin servidor) usa la Edge Function
 * Supabase "admin-agent". Devuelve { reply, actions } en ambos casos.
 */
async function callCopilot(messages: AiMessage[]): Promise<{ reply: string; actions: string[] }> {
  // 1. Intento local: server function (solo existe con `npm run dev`).
  try {
    const local = await callLocalAgent(messages);
    return local;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    // Solo caemos a la Edge Function si el fallo es "no hay servidor".
    if (!/invariant failed/i.test(raw)) throw error;
  }
  // 2. Web publicada: Edge Function de Supabase.
  const { data, error } = await supabase.functions.invoke("admin-agent", {
    body: { messages },
  });
  if (error) throw new Error(error.message || "La Edge Function no ha respondido.");
  if (!data || typeof data.reply !== "string") {
    throw new Error(
      typeof (data as { error?: string } | null)?.error === "string"
        ? String((data as { error: string }).error)
        : "Respuesta vacía de la Edge Function.",
    );
  }
  return data as { reply: string; actions: string[] };
}

// useServerFn debe llamarse a nivel de componente: se crea una vez aquí.
function useLocalAgent() {
  return useServerFn(runAdminAgent);
}

let localAgentRef: ((args: { data: { messages: AiMessage[] } }) => Promise<{
  reply: string;
  actions: string[];
}>) | null = null;

async function callLocalAgent(
  messages: AiMessage[],
): Promise<{ reply: string; actions: string[] }> {
  if (!localAgentRef) throw new Error("Invariant failed: no server function in this build.");
  return localAgentRef({ data: { messages } });
}

export function AiCopilot() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();
  // En local apunta a la server function real; en el build estático a un
  // marcador que falla con "Invariant failed" y activa el fallback a la Edge.
  try {
    localAgentRef = useServerFn(runAdminAgent);
  } catch {
    localAgentRef = null;
  }

  const mutation = useMutation({
    mutationFn: (next: AiMessage[]) => callCopilot(next),

    onSuccess: (result) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply,
        },
      ]);

      if (result.actions.length > 0) {
        toast.success(
          "Cambios aplicados: " + result.actions.length,
        );

        queryClient.invalidateQueries();
      }
    },

    onError: (error: Error) => {
      console.error("[ai-copilot] copilot failed", error);
      const raw = error?.message ?? "";
      toast.error(
        raw.includes("Edge Function no desplegada") || raw.includes("Failed to send a request")
          ? "La Edge Function 'admin-agent' aún no está desplegada en Supabase. Despliégala con: supabase functions deploy admin-agent (ver supabase/functions/admin-agent/README.md)."
          : raw || "La IA no ha podido responder. Revisa la consola (F12) para más detalle.",
        { duration: 8000 },
      );
    },
  });

  function send(text: string) {
    const clean = text.trim();

    if (!clean || mutation.isPending) {
      return;
    }

    const next: AiMessage[] = [
      ...messages,
      {
        role: "user",
        content: clean,
      },
    ];

    setMessages(next);
    setInput("");

    mutation.mutate(next.slice(-20));
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Bot className="size-5" />
        </span>

        <div>
          <h2 className="font-display text-lg font-semibold">
            Copiloto de IA
          </h2>

          <p className="text-sm text-muted-foreground">
            Pídele que cree productos, fichas técnicas, artículos o
            listas Top: los aplica en la base de datos.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Funciona en local y en la web publicada (Edge Function de Supabase).
          </p>
        </div>
      </div>

      <div className="mt-5 max-h-[420px] space-y-4 overflow-y-auto rounded-lg border border-border bg-surface p-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Prueba con:
            </p>

            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="block w-full rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="flex gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                {message.role === "user" ? (
                  <User className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </span>

              <p className="whitespace-pre-line text-sm leading-relaxed">
                {message.content}
              </p>
            </div>
          ))
        )}

        {mutation.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Trabajando…
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="Describe la tarea…"
          className="resize-none"
        />

        <Button
          onClick={() => send(input)}
          disabled={mutation.isPending}
          className="self-end"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </section>
  );
}
