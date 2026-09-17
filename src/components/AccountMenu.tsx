import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogIn, LogOut, Trophy, UserRound, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { avatars, memberQuery } from "@/lib/member";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function AccountMenu() {
  const { user, loading, isAdmin } = useAuth();
  const member = useQuery(memberQuery(user?.id));
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await cache.cancelQueries({ queryKey: ["member"] });
      cache.removeQueries({ queryKey: ["member"] });
      await navigate({ to: "/" });
    } catch {
      toast.error("No se pudo cerrar sesión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <Button variant="outline" disabled aria-label="Comprobando sesión">
        <UserRound />
      </Button>
    );
  if (!user)
    return (
      <Button asChild size="sm">
        <Link to="/auth">
          <LogIn />
          Iniciar sesión
        </Link>
      </Button>
    );
  const profile = member.data?.profile;
  const avatar = avatars[profile?.avatar as keyof typeof avatars] ?? avatars.robot;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy} aria-label="Abrir menú de mi cuenta">
          <span aria-hidden="true">{avatar}</span>
          <span className="max-w-28 truncate hidden sm:inline">
            {profile?.display_name || "Mi cuenta"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserRound />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil" hash="logros">
            <Trophy />
            Mis logros
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <Shield />
              Administración
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={busy} onSelect={() => void signOut()}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
