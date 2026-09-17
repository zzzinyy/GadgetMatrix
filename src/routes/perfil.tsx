import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { avatars, memberQuery, saveProfile } from "@/lib/member";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [{ title: "Mi perfil y logros | GadgetMatrix" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

function ProfileForm({ profile }: { profile: Tables<"profiles"> }) {
  const [name, setName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: () => saveProfile(profile.user_id, { display_name: name, bio, avatar }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["member", profile.user_id] });
      toast.success("Perfil guardado");
    },
    onError: () =>
      toast.error("No se pudo guardar el perfil. Revisa los datos y vuelve a intentarlo."),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }
  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold">Personaliza tu perfil</h2>
      <p className="text-sm text-muted-foreground">
        Tu perfil y tus logros son privados. Solo tú puedes verlos.
      </p>
      <fieldset disabled={save.isPending} className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Elige tu avatar</legend>
          <div className="flex flex-wrap gap-3">
            {Object.entries(avatars).map(([id, emoji]) => (
              <label
                key={id}
                className="cursor-pointer rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  className="sr-only peer"
                  type="radio"
                  name="avatar"
                  value={id}
                  checked={avatar === id}
                  onChange={() => setAvatar(id)}
                />
                <span className="text-2xl peer-focus-visible:outline" role="img" aria-label={id}>
                  {emoji}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="display-name">Nombre</Label>
          <Input
            id="display-name"
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Sobre ti</Label>
          <Textarea id="bio" maxLength={240} value={bio} onChange={(e) => setBio(e.target.value)} />
          <p className="text-xs text-muted-foreground">{bio.length}/240 caracteres</p>
        </div>
        <Button type="submit">{save.isPending ? "Guardando…" : "Guardar perfil"}</Button>
      </fieldset>
    </form>
  );
}

function ProfilePage() {
  const { user, loading } = useAuth();
  const member = useQuery(memberQuery(user?.id));
  if (loading)
    return (
      <p className="p-8" role="status">
        Comprobando sesión…
      </p>
    );
  if (!user)
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-16">
        <h1 className="text-2xl font-bold">Tu espacio en GadgetMatrix</h1>
        <p>Inicia sesión para personalizar tu perfil y guardar tus logros.</p>
        <Button asChild>
          <Link to="/auth">Iniciar sesión o registrarme</Link>
        </Button>
      </div>
    );
  if (member.isError)
    return (
      <div className="p-8 space-y-3" role="alert">
        <p>No se pudo cargar tu perfil. Tus datos no se han modificado.</p>
        <Button onClick={() => void member.refetch()}>Reintentar</Button>
      </div>
    );
  if (!member.data)
    return (
      <p className="p-8" role="status">
        Cargando tu perfil…
      </p>
    );
  const achievement = member.data.achievements.find((a) => a.achievement_id === "first_visit");
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Mi perfil</h1>
      <ProfileForm key={user.id} profile={member.data.profile} />
      <section id="logros" className="space-y-4 scroll-mt-32">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <Trophy className="text-primary" />
          Mis logros
        </h2>
        <p className="text-sm text-muted-foreground">
          {achievement ? 1 : 0} de 1 desbloqueados. Se guardan en tu cuenta, también entre
          dispositivos.
        </p>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold">🚀 Primer contacto</h3>
          <p>Visita GadgetMatrix con la sesión iniciada.</p>
          <p className="mt-2 text-sm text-primary">
            {achievement
              ? `Conseguido el ${new Date(achievement.unlocked_at).toLocaleDateString("es-ES")}`
              : "Pendiente"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Logro decorativo, sin premios ni permisos adicionales. Las visitas anteriores sin sesión
          no se contabilizan.
        </p>
      </section>
    </div>
  );
}
