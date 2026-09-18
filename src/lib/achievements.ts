export type AchievementKind = "route" | "profile" | "review" | "system";

export type Achievement = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  kind: AchievementKind;
  sortOrder: number;
  /** Cómo se consigue, para las tarjetas todavía bloqueadas. */
  hint: string;
};

/**
 * Copia del catálogo sembrado en drizzle/migrations/0008_member_achievements.sql.
 * El servidor valida cada id contra su propia tabla; tests/achievements.test.mjs
 * compara ambas listas para que no se desincronicen.
 */
export const achievementCatalog: Achievement[] = [
  {
    id: "first_visit",
    emoji: "🚀",
    title: "Primer contacto",
    description: "Visita GadgetMatrix con la sesión iniciada.",
    kind: "system",
    sortOrder: 10,
    hint: "Entra en la web con tu cuenta.",
  },
  {
    id: "returning_visitor",
    emoji: "🔁",
    title: "Vuelves por más",
    description: "Entra en GadgetMatrix en dos días distintos.",
    kind: "system",
    sortOrder: 20,
    hint: "Vuelve otro día con la sesión iniciada.",
  },
  {
    id: "explore_catalog",
    emoji: "🧭",
    title: "Explorador de catálogo",
    description: "Abre la sección de productos.",
    kind: "route",
    sortOrder: 30,
    hint: "Visita Productos.",
  },
  {
    id: "product_explorer",
    emoji: "📱",
    title: "Ficha técnica",
    description: "Consulta la ficha de un producto.",
    kind: "route",
    sortOrder: 40,
    hint: "Abre cualquier producto del catálogo.",
  },
  {
    id: "compare_devices",
    emoji: "🆚",
    title: "Cara a cara",
    description: "Abre el comparador de gadgets.",
    kind: "route",
    sortOrder: 50,
    hint: "Visita el Comparador.",
  },
  {
    id: "quiz_master",
    emoji: "🧠",
    title: "Mente tecnológica",
    description: "Pásate por el quiz de GadgetMatrix.",
    kind: "route",
    sortOrder: 60,
    hint: "Visita el Quiz.",
  },
  {
    id: "top_reader",
    emoji: "🏆",
    title: "Cazador de rankings",
    description: "Consulta nuestras listas Top.",
    kind: "route",
    sortOrder: 70,
    hint: "Visita la sección Top.",
  },
  {
    id: "deal_hunter",
    emoji: "💸",
    title: "Cazachollos",
    description: "Revisa la sección de chollos.",
    kind: "route",
    sortOrder: 80,
    hint: "Visita Chollos.",
  },
  {
    id: "blog_reader",
    emoji: "📰",
    title: "Lector empedernido",
    description: "Lee el blog de GadgetMatrix.",
    kind: "route",
    sortOrder: 90,
    hint: "Visita el Blog.",
  },
  {
    id: "profile_complete",
    emoji: "✨",
    title: "Perfil completo",
    description: "Rellena tu nombre y escribe una bio.",
    kind: "profile",
    sortOrder: 100,
    hint: "Guarda tu perfil con nombre y bio.",
  },
  {
    id: "first_review",
    emoji: "📝",
    title: "Voz de la comunidad",
    description: "Publica tu primera reseña en un producto.",
    kind: "review",
    sortOrder: 110,
    hint: "Deja una reseña en la ficha de un producto.",
  },
];

export const achievementById = new Map(achievementCatalog.map((entry) => [entry.id, entry]));

/** Rutas de la web que desbloquean un logro. El orden decide la prioridad. */
const routeAchievements: ReadonlyArray<{ prefix: string; id: string }> = [
  { prefix: "/producto/", id: "product_explorer" },
  { prefix: "/productos", id: "explore_catalog" },
  { prefix: "/comparador", id: "compare_devices" },
  { prefix: "/quiz", id: "quiz_master" },
  { prefix: "/top", id: "top_reader" },
  { prefix: "/chollos", id: "deal_hunter" },
  { prefix: "/blog", id: "blog_reader" },
];

/**
 * Logro asociado a una ruta, ignorando barra final, hash y query. Se compara por
 * segmentos completos para que `/productos-inventados` no cuente como `/productos`.
 */
export function achievementForPath(pathname: string): string | undefined {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return routeAchievements.find((entry) => {
    const base = entry.prefix.replace(/\/$/, "");
    return clean === base || clean.startsWith(`${base}/`);
  })?.id;
}

export type Rank = { name: string; minimum: number };

export const ranks: Rank[] = [
  { name: "Novato", minimum: 0 },
  { name: "Explorador", minimum: 3 },
  { name: "Entendido", minimum: 6 },
  { name: "Gurú", minimum: 9 },
  { name: "Leyenda", minimum: achievementCatalog.length },
];

export function rankFor(unlockedCount: number): Rank {
  let current = ranks[0];
  for (const rank of ranks) {
    if (unlockedCount >= rank.minimum) current = rank;
  }
  return current;
}

export type AchievementProgress = {
  unlockedCount: number;
  total: number;
  percent: number;
  rank: Rank;
  next: Achievement | undefined;
};

/** Progreso del miembro. Los ids desconocidos se ignoran. */
export function achievementProgress(unlockedIds: Iterable<string>): AchievementProgress {
  const owned = new Set(unlockedIds);
  const unlockedCount = achievementCatalog.filter((entry) => owned.has(entry.id)).length;
  const total = achievementCatalog.length;
  return {
    unlockedCount,
    total,
    percent: total === 0 ? 0 : Math.round((unlockedCount / total) * 100),
    rank: rankFor(unlockedCount),
    next: achievementCatalog.find((entry) => !owned.has(entry.id)),
  };
}

export type ProfileDraft = { display_name: string; bio: string };

/** Mismo criterio que la función unlock_achievement() en la base de datos. */
export function profileChecklist(profile: ProfileDraft) {
  return [
    {
      id: "display_name",
      label: "Escribe tu nombre",
      done: profile.display_name.trim().length > 0,
    },
    { id: "bio", label: "Añade una bio para presentarte", done: profile.bio.trim().length > 0 },
  ];
}

export function isProfileComplete(profile: ProfileDraft) {
  return profileChecklist(profile).every((item) => item.done);
}

/** Fecha corta y estable (siempre en UTC, como los contadores del servidor). */
export function formatDay(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
