import { z } from "zod";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const avatars = { robot: "🤖", rocket: "🚀", gamepad: "🎮", bolt: "⚡" } as const;
export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Escribe tu nombre").max(40),
  bio: z.string().trim().max(240),
  avatar: z.enum(["robot", "rocket", "gamepad", "bolt"]),
});

export function memberQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["member", userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      if (!userId) throw new Error("Inicia sesión para ver tu perfil");
      const visit = await supabase.rpc("record_member_visit");
      if (visit.error) throw visit.error;
      const [profile, achievements] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).abortSignal(signal).single(),
        supabase.from("user_achievements").select("*").eq("user_id", userId).abortSignal(signal),
      ]);
      if (profile.error) throw profile.error;
      if (achievements.error) throw achievements.error;
      return { profile: profile.data, achievements: achievements.data };
    },
  });
}

export async function saveProfile(userId: string, input: unknown) {
  const payload = profileSchema.parse(input);
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
