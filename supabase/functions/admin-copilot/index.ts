import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  try {
    // Comprobar API key de Gemini
    if (!GEMINI_API_KEY) {
      return Response.json(
        { error: "GEMINI_API_KEY no está configurada en Supabase." },
        { status: 500, headers: corsHeaders },
      );
    }

    // Obtener usuario desde el JWT enviado por el navegador
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return Response.json(
        { error: "No estás autenticado." },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    // Obtener usuario actual
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Sesión no válida." },
        { status: 401, headers: corsHeaders },
      );
    }

    // Comprobar que es administrador
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Error comprobando rol:", roleError);

      return Response.json(
        { error: "No se pudo comprobar el permiso de administrador." },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!role) {
      return Response.json(
        { error: "No tienes permisos de administrador." },
        { status: 403, headers: corsHeaders },
      );
    }

    // Leer mensajes
    const body: RequestBody = await req.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return Response.json(
        { error: "Formato de mensajes incorrecto." },
        { status: 400, headers: corsHeaders },
      );
    }

    // Limitar tamaño para evitar peticiones enormes
    const messages = body.messages.slice(-20);

    // Preparar conversación para Gemini
    const contents = messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: message.content,
        },
      ],
    }));

    const systemInstruction = `
Eres el Copiloto de administración de GadgetMatrix.

GadgetMatrix es una web de tecnología y productos electrónicos.

Tu usuario es un administrador autorizado.

Tu función actual es ayudar al administrador a gestionar y consultar GadgetMatrix.

Puedes:
- Responder preguntas sobre la administración de la web.
- Ayudar a redactar nombres y descripciones de productos.
- Ayudar a organizar información de productos.
- Explicar qué debería hacer el administrador para realizar una acción.

IMPORTANTE:
En esta primera versión NO ejecutes cambios directamente en la base de datos.
No inventes productos, precios, categorías ni datos.
Si el administrador pide crear, modificar o eliminar algo, explica lo que habría que hacer.

Responde siempre en español, de forma clara y breve.
`;

    // Llamar a Gemini
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(GEMINI_API_KEY),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: systemInstruction,
              },
            ],
          },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1000,
          },
        }),
      },
    );

    const geminiData = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", geminiData);

      return Response.json(
        {
          error:
            geminiData?.error?.message ||
            "Gemini no pudo procesar la solicitud.",
        },
        { status: 500, headers: corsHeaders },
      );
    }

    const answer =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("") || "No he podido generar una respuesta.";

    return Response.json(
      {
        message: answer,
      },
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error("admin-copilot error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del Copiloto.",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});