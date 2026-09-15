# Edge Function `admin-agent`

Copiloto de IA del panel `/admin`. Funciona en la web publicada (GitHub Pages),
donde no hay server functions de TanStack.

## Qué hace

1. Verifica el JWT del usuario con `auth.getClaims`.
2. Comprueba `has_role(usuario, 'admin')` vía `service_role`.
3. Ejecuta el núcleo compartido `runAgentCore` de
   `src/lib/ai-admin.functions.ts` (mismas herramientas que en local).
4. Llama al gateway de IA con `LOVABLE_API_KEY`.

El cliente (`src/components/AiCopilot.tsx`) usa esta función solo cuando la
server function local no existe (build estático). En `npm run dev` sigue
usando la server function, sin cambios.

## Despliegue (una vez + cada cambio)

Necesitas [Supabase CLI](https://supabase.com/docs/guides/cli):

```powershell
# Login y vínculo (solo la primera vez)
supabase login
supabase link --project-ref zszxncihhrdwjsuxcrhp

# Secretos (solo la primera vez; nunca van al repo)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="tu_service_role"
supabase secrets set LOVABLE_API_KEY="tu_api_key"

# Desplegar
supabase functions deploy admin-agent
```

`SUPABASE_URL` y `SUPABASE_ANON_KEY` los pone Supabase solos. La función
importa el núcleo con ruta relativa (`../../src/lib/ai-admin.functions.ts`),
así que cada deploy lleva el código actual: si cambias herramientas o el
prompt, redespliega.

## Probar

```powershell
# En local contra el proyecto real (requiere `supabase link` previo)
supabase functions serve admin-agent --env-file .env
```

Luego en `/admin`, escribe al copiloto. Si la función no está desplegada,
el panel muestra un aviso que lo indica en vez del críptico
"Invariant failed".
