import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { achievementById, achievementForPath } from "@/lib/achievements";
import { unlockAchievement } from "@/lib/member";

/**
 * Pide un logro al servidor y avisa al miembro solo cuando es nuevo.
 * Devuelve `false` si ya lo tenía. Si la petición falla, registra el error y lo
 * relanza para que quien llama decida si reintenta.
 */
export function useUnlockAchievement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  return useCallback(
    async (achievementId: string) => {
      let unlocked: boolean;
      try {
        unlocked = await unlockAchievement(achievementId);
      } catch (error) {
        console.error("[achievements] no se pudo desbloquear el logro", achievementId, error);
        throw error;
      }
      if (!unlocked) return false;
      const achievement = achievementById.get(achievementId);
      toast.success(`Logro desbloqueado · ${achievement?.title ?? achievementId}`, {
        description: achievement?.description,
        // Aviso discreto en la esquina inferior: no debe tapar la navegación.
        icon: achievement?.emoji,
        closeButton: true,
        duration: 6_000,
      });
      await queryClient.invalidateQueries({ queryKey: ["member", userId] });
      return true;
    },
    [queryClient, userId],
  );
}

/**
 * Desbloquea los logros ligados a la navegación. Cada ruta se intenta una sola
 * vez por sesión: el servidor seguiría devolviendo `false`, pero así no se
 * repiten peticiones al cambiar de pestaña.
 */
export function useAchievementTracker() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user } = useAuth();
  const unlock = useUnlockAchievement();
  const attempted = useRef(new Set<string>());
  const userId = user?.id;

  useEffect(() => {
    attempted.current = new Set<string>();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const achievementId = achievementForPath(pathname);
    if (!achievementId || attempted.current.has(achievementId)) return;
    attempted.current.add(achievementId);
    let active = true;
    void unlock(achievementId).catch(() => {
      // Un fallo de red se reintenta en la siguiente navegación.
      if (active) attempted.current.delete(achievementId);
    });
    return () => {
      active = false;
    };
  }, [pathname, userId, unlock]);
}
