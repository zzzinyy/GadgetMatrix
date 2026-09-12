```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso administrador | GadgetMatrix" },
      {
        name: "description",
        content:
          "Inicia sesión para gestionar los productos y fichas técnicas de GadgetMatrix.",
      },
      {
        property: "og:title",
        content: "Acceso administrador | GadgetMatrix",
      },
      {
        property: "og:description",
        content: "Panel de gestión del catálogo.",
      },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Introduce un email válido" })
    .max(255),
  password: z
    .string()
    .min(6, { message: "Mínimo 6 caracteres" })
    .max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  function getAdminRedirectUrl() {
    return `${window.location.origin}/GadgetMatrix/admin`;
  }

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) {
      navigate({ to: "/admin" });
    }
  }, [session, navigate]);

  function toggleMode() {
    if (busy) return;

    setMode((currentMode) =>
      currentMode === "login" ? "signup" : "login"
    );

    setEmail("");
    setPassword("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const parsed = schema.safeParse({
      email,
      password,
    });

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Datos inválidos"
      );
      return;
    }

    setBusy(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword(
          parsed.data
        );

        if (error) {
          throw error;
        }

        toast.success("Sesión iniciada");
      } else {
        const { error } = await supabase.auth.signUp({
          ...parsed.data,
          options: {
            emailRedirectTo: getAdminRedirectUrl(),
          },
        });

        if (error) {
          throw error;
        }

        toast.success(
          "Cuenta creada. Ya puedes iniciar sesión."
        );

        setMode("login");
        setPassword("");
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo completar la operación"
      );
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: getAdminRedirectUrl(),
          },
        });

      if (error) {
        throw error;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar sesión con Google"
      );

      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20">
      <h1 className="font-display text-2xl font-bold">
        {mode === "login"
          ? "Acceso administrador"
          : "Crear cuenta"}
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Gestiona productos, fichas técnicas y el tag de afiliado.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={255}
            disabled={busy}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>

          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "login"
                ? "current-password"
                : "new-password"
            }
            maxLength={72}
            disabled={busy}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={busy}
        >
          {mode === "login" ? "Entrar" : "Registrarme"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onGoogle}
          disabled={busy}
        >
          Continuar con Google
        </Button>

        <button
          type="button"
          onClick={toggleMode}
          disabled={busy}
          className="block w-full cursor-pointer rounded-md p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "login"
            ? "¿No tienes cuenta? Regístrate"
            : "Ya tengo cuenta"}
        </button>
      </form>
    </div>
  );
}
```

**Importante:** en tu caso hay otro problema distinto que debemos arreglar después: el error `TypeError: "" is not a function` de `vite.config.ts` y el `mod.fetch is not a function`. **No lo vamos a solucionar tocando más el botón de login.**

Primero pega este archivo, haz commit/push y ejecuta el build. Si vuelve a salir la cruz roja, pásame **solo el nuevo error del build** y seguimos desde ahí.
