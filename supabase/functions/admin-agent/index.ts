// Edge Function: admin-agent — copiloto de IA para la web publicada.
// Verifica JWT de Supabase, comprueba rol admin, y ejecuta el núcleo
// compartido de src/lib/ai-admin.functions.ts con service_role.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";
import { runAgentCore, type AdminDb } from "../_shared/admin-core.ts";
import { corsHeaders, preflightResponse } from "../_shared/cors.ts";

const inputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .min(1)
    .max(30),
});

const GROQ_KEY =
  Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("GROQ-API-KEY") ?? undefined;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return preflightResponse(origin);
  }
  const headers = corsHeaders(origin);
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const AI_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_KEY || !AI_KEY) {
      return Response.json(
        { error: "Falta configuración del servidor (secretos de Supabase o IA)." },
        { status: 500, headers },
      );
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return Response.json({ error: "No autorizado." }, { status: 401, headers });
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) {
      return Response.json({ error: "Sesión no válida." }, { status: 401, headers });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) {
      return Response.json(
        { error: "No se pudo verificar el rol de administrador." },
        { status: 500, headers },
      );
    }
    if (!isAdmin) {
      return Response.json(
        { error: "Solo los administradores pueden usar el copiloto." },
        { status: 403, headers },
      );
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = inputSchema.safeParse((body as { data?: unknown })?.data ?? body);
    if (!parsed.success) {
      return Response.json(
        { error: "Petición no válida.", detail: parsed.error.issues.map((i) => i.message) },
        { status: 400, headers },
      );
    }

    const result = await runAgentCore(
      {
        supabaseAdmin: supabaseAdmin as unknown as AdminDb,
        apiKey: AI_KEY,
        groqApiKey: GROQ_KEY,
      },
      parsed.data.messages,
    );
    return Response.json(result, { headers });
  } catch (error) {
    console.error("[admin-agent]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Error interno." },
      { status: 500, headers },
    );
  }
});
