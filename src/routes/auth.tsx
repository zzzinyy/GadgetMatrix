import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
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
      { title: "Iniciar sesión | GadgetMatrix" },
      {
        name: "description",
        content: "Personaliza tu perfil y guarda tus logros en GadgetMatrix.",
      },
      { property: "og:title", content: "Iniciar sesión | GadgetMatrix" },
      {
        property: "og:description",
        content: "Tu cuenta de GadgetMatrix.",
      },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "Introduce un email válido" }).max(255),
  password: z.string().min(6, { message: "Mínimo 6 caracteres" }).max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) {
      navigate({ to: "/perfil" });
    }
  }, [session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    const parsed = schema.safeParse({ email, password });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    setBusy(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);

        if (error) throw error;

        toast.success("Sesión iniciada");
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: {
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}perfil`,
          },
        });

        if (error) throw error;

        toast.success(
          data.session
            ? "Cuenta creada. ¡Bienvenido a GadgetMatrix!"
            : "Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
        );
      }
    } catch (err) {
      console.error("[auth] signIn/signUp failed", err);
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "No se pudo completar la operación. Revisa la consola (F12) para más detalle.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20">
      <h1 className="font-display text-2xl font-bold">
        {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Personaliza tu perfil y consigue logros en GadgetMatrix.
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
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            maxLength={72}
            disabled={busy}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "login" ? "Entrar" : "Registrarme"}
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
          disabled={busy}
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
        </button>
      </form>
    </div>
  );
}
