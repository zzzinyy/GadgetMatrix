import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  runAgentCore,
  type AdminDb,
} from "../../supabase/functions/_shared/admin-core.ts";

export * from "../../supabase/functions/_shared/admin-core.ts";

export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

export const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export const runAdminAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ reply: string; actions: string[] }> => {
    const adminCheck = (await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId,
      _role: "admin",
    } as never)) as unknown as { data: boolean | null; error: { message: string } | null };
    if (adminCheck.error) throw new Error("No se pudo verificar el rol de administrador.");
    if (!adminCheck.data) throw new Error("Solo los administradores pueden usar el copiloto.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta la configuración de la IA.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return runAgentCore(
      {
        supabaseAdmin: supabaseAdmin as unknown as AdminDb,
        apiKey,
        groqApiKey: process.env["GROQ_API_KEY"] ?? undefined,
      },
      data.messages,
    );
  });
