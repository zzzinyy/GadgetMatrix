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
 * Llama al copiloto. Prioridad:
 * 1. Edge Function "admin-copilot" (desplegada y con GEMINI_API_KEY) — solo consejo.
 * 2. Server function TanStack (npm run dev) — puede escribir en la BD.
 * En local sin servidor, 1 falla y 2 responde; en Pages, 1 responde.
 */
async function callCopilot(messages: AiMessage[]): Promise<{ reply: string; actions: string[] }> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-copilot", {
      body: { messages },
    });
    if (error) throw error;
    const reply =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.reply === "string"
          ? data.reply
          : null;
    if (!reply) {
      const detail =
        typeof data?.error === "string" ? data.error : "Respuesta vacía del copiloto.";
      throw new Error(detail);
    }
    const actions = Array.isArray(data?.actions) ? data.actions : [];
    return { reply, actions };
  } catch (edgeError) {
    // Sin Edge (local sin deploy): caemos a la server function de TanStack.
    try {
      return await callLocalAgent(messages);
    } catch (localError) {
      const raw =
        localError instanceof Error ? localError.message : "La IA no ha podido responder.";
      if (/invariant failed/i.test(raw)) {
        const edgeRaw = edgeError instanceof Error ? edgeError.message : "";
        throw new Error(
          edgeRaw || "El copiloto no responde: revisa la Edge Function 'admin-copilot'.",
        );
      }
      throw localError instanceof Error ? localError : new Error(raw);
    }
  }
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
            Responde dudas y te ayuda a redactar productos, artículos o listas Top.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Consejos en la web publicada; cambios en la base de datos solo en local.
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
