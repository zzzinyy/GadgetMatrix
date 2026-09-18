import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Check, Circle, Lock, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUnlockAchievement } from "@/hooks/useAchievements";
import {
  achievementCatalog,
  achievementProgress,
  formatDay,
  isProfileComplete,
  profileChecklist,
} from "@/lib/achievements";
import { avatars, memberQuery, saveProfile } from "@/lib/member";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil y logros | GadgetMatrix" },
      {
        name: "description",
        content:
          "Personaliza tu perfil de miembro, consulta tus estadísticas y descubre los logros que has desbloqueado en GadgetMatrix.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type ProfileRow = Tables<"profiles">;
type AchievementRow = Tables<"user_achievements">;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function IdentityCard({
  profile,
  achievements,
}: {
  profile: ProfileRow;
  achievements: AchievementRow[];
}) {
  const avatar = avatars[profile.avatar as keyof typeof avatars] ?? avatars.robot;
  const progress = achievementProgress(achievements.map((row) => row.achievement_id));
  return (
    <section className="space-y-5 rounded-xl border bg-card p-6" aria-label="Resumen de tu cuenta">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span
          className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-4xl"
          role="img"
          aria-label={`Avatar ${profile.avatar}`}
        >
          {avatar}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-2xl font-semibold">
              {profile.display_name || "Sin nombre todavía"}
            </h2>
            <Badge>{progress.rank.name}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {profile.bio || "Todavía no has escrito tu bio."}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <Stat label="Miembro desde" value={formatDay(profile.created_at) ?? "—"} />
        <Stat label="Días por aquí" value={String(profile.days_visited)} />
        <Stat label="Última visita" value={formatDay(profile.last_visit_on) ?? "Hoy"} />
      </dl>
    </section>
  );
}

function AchievementsSection({ achievements }: { achievements: AchievementRow[] }) {
  const unlockedAt = new Map(achievements.map((row) => [row.achievement_id, row.unlocked_at]));
  const progress = achievementProgress(unlockedAt.keys());
  return (
    <section
      id="logros"
      className="space-y-4 scroll-mt-32 rounded-xl border bg-card p-5"
      aria-label="Mis logros"
    >
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Trophy className="text-primary" aria-hidden="true" />
          Mis logros
        </h2>
        <p className="text-sm text-muted-foreground">
          {progress.unlockedCount} de {progress.total} desbloqueados · Rango {progress.rank.name}
        </p>
      </div>
      <Progress value={progress.percent} aria-label={`Progreso de logros: ${progress.percent}%`} />
      <p className="rounded-lg border bg-surface p-3 text-sm text-muted-foreground">
        {progress.next
          ? `Siguiente objetivo: ${progress.next.emoji} ${progress.next.title}. ${progress.next.hint}`
          : "¡Has desbloqueado todos los logros! Eres leyenda de GadgetMatrix."}
      </p>

      <ul className="grid gap-3">
        {achievementCatalog.map((achievement) => {
          const unlocked = unlockedAt.get(achievement.id);
          return (
            <li
              key={achievement.id}
              className={
                unlocked
                  ? "rounded-lg border border-primary/40 bg-primary/5 p-4"
                  : "rounded-lg border bg-background p-4 opacity-70"
              }
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" role="img" aria-label={achievement.title}>
                  {achievement.emoji}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {achievement.title}
                    {unlocked ? (
                      <Check className="size-4 text-primary" aria-label="Conseguido" />
                    ) : (
                      <Lock className="size-4 text-muted-foreground" aria-label="Bloqueado" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {unlocked
                      ? `Conseguido el ${formatDay(unlocked) ?? "—"}`
                      : `Cómo conseguirlo: ${achievement.hint}`}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Los logros son decorativos: no dan premios, descuentos ni permisos adicionales. Se guardan
        en tu cuenta y te acompañan entre dispositivos.
      </p>
    </section>
  );
}

function ProfileForm({ profile }: { profile: ProfileRow }) {
  const [name, setName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const cache = useQueryClient();
  const unlock = useUnlockAchievement();
  const checklist = profileChecklist({ display_name: name, bio });
  const save = useMutation({
    mutationFn: () => saveProfile(profile.user_id, { display_name: name, bio, avatar }),
    onSuccess: async (data) => {
      await cache.invalidateQueries({ queryKey: ["member", profile.user_id] });
      toast.success("Perfil guardado");
      if (isProfileComplete({ display_name: data.display_name, bio: data.bio })) {
        // El servidor solo lo concede si el perfil guardado está completo.
        await unlock("profile_complete").catch(() => undefined);
      }
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
      <h2 className="font-display text-xl font-semibold">Personaliza tu perfil</h2>
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
        <div className="rounded-lg border bg-surface p-4">
          <p className="text-sm font-medium">Requisitos del logro «Perfil completo»</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                {item.done ? (
                  <Check className="size-4 text-primary" aria-hidden="true" />
                ) : (
                  <Circle className="size-4" aria-hidden="true" />
                )}
                <span className={item.done ? "line-through" : undefined}>{item.label}</span>
              </li>
            ))}
          </ul>
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
        <h1 className="font-display text-2xl font-bold">Tu espacio en GadgetMatrix</h1>
        <p>Inicia sesión para personalizar tu perfil, coleccionar logros y publicar reseñas.</p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>· Elige tu avatar, tu nombre y tu bio.</li>
          <li>· Desbloquea logros mientras exploras la web.</li>
          <li>· Tu perfil es privado: nadie más puede verlo.</li>
        </ul>
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
  const { profile, achievements } = member.data;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="max-w-3xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Área de miembro
        </p>
        <h1 className="font-display text-3xl font-bold">Mi perfil</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Personaliza cómo te ve la comunidad y colecciona logros mientras exploras GadgetMatrix.
          Nadie más puede ver este panel.
        </p>
      </header>
      {/* En móvil: resumen, logros y formulario. En pantallas grandes los logros
          pasan a una columna lateral que acompaña al desplazamiento. */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
          <IdentityCard profile={profile} achievements={achievements} />
        </div>
        <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <AchievementsSection achievements={achievements} />
        </aside>
        <div className="lg:col-start-1 lg:row-start-2">
          <ProfileForm key={user.id} profile={profile} />
        </div>
      </div>
    </div>
  );
}
