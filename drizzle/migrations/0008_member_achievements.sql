BEGIN;

-- Achievement labels live in the database so the server can validate every id,
-- while the client keeps a mirrored copy for locked cards (see
-- src/lib/achievements.ts and tests/achievements.test.mjs).
CREATE TABLE public.achievement_catalog (
  id text PRIMARY KEY CHECK (id ~ '^[a-z_]{3,40}$'),
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 60),
  description text NOT NULL CHECK (char_length(description) BETWEEN 3 AND 200),
  kind text NOT NULL CHECK (kind IN ('route', 'profile', 'review', 'system')),
  sort_order integer NOT NULL UNIQUE CHECK (sort_order > 0)
);
ALTER TABLE public.achievement_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.achievement_catalog FROM anon, authenticated;
GRANT SELECT ON public.achievement_catalog TO anon, authenticated;
GRANT ALL ON public.achievement_catalog TO service_role;
CREATE POLICY "Achievement catalog is public" ON public.achievement_catalog
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.achievement_catalog (id, emoji, title, description, kind, sort_order) VALUES
  ('first_visit', '🚀', 'Primer contacto', 'Visita GadgetMatrix con la sesión iniciada.', 'system', 10),
  ('returning_visitor', '🔁', 'Vuelves por más', 'Entra en GadgetMatrix en dos días distintos.', 'system', 20),
  ('explore_catalog', '🧭', 'Explorador de catálogo', 'Abre la sección de productos.', 'route', 30),
  ('product_explorer', '📱', 'Ficha técnica', 'Consulta la ficha de un producto.', 'route', 40),
  ('compare_devices', '🆚', 'Cara a cara', 'Abre el comparador de gadgets.', 'route', 50),
  ('quiz_master', '🧠', 'Mente tecnológica', 'Pásate por el quiz de GadgetMatrix.', 'route', 60),
  ('top_reader', '🏆', 'Cazador de rankings', 'Consulta nuestras listas Top.', 'route', 70),
  ('deal_hunter', '💸', 'Cazachollos', 'Revisa la sección de chollos.', 'route', 80),
  ('blog_reader', '📰', 'Lector empedernido', 'Lee el blog de GadgetMatrix.', 'route', 90),
  ('profile_complete', '✨', 'Perfil completo', 'Rellena tu nombre y escribe una bio.', 'profile', 100),
  ('first_review', '📝', 'Voz de la comunidad', 'Publica tu primera reseña en un producto.', 'review', 110);

ALTER TABLE public.user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_achievement_id_check;
ALTER TABLE public.user_achievements
  ADD CONSTRAINT user_achievements_achievement_id_fkey
  FOREIGN KEY (achievement_id) REFERENCES public.achievement_catalog(id) ON DELETE CASCADE;

-- Visit counters are driven by the server only (no UPDATE grant for members).
ALTER TABLE public.profiles
  ADD COLUMN days_visited integer NOT NULL DEFAULT 0 CHECK (days_visited >= 0),
  ADD COLUMN last_visit_on date;

-- Idempotent: returns true when the visit counted as a new day.
CREATE OR REPLACE FUNCTION public.record_member_visit()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  member_id uuid := auth.uid();
  today date := (now() AT TIME ZONE 'utc')::date;
  previous_day date;
  counted_days integer;
BEGIN
  IF member_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.profiles (user_id) VALUES (member_id) ON CONFLICT DO NOTHING;
  SELECT last_visit_on INTO previous_day FROM public.profiles WHERE user_id = member_id;
  IF previous_day IS NOT DISTINCT FROM today THEN
    RETURN false;
  END IF;
  UPDATE public.profiles
    SET days_visited = days_visited + 1, last_visit_on = today
    WHERE user_id = member_id
    RETURNING days_visited INTO counted_days;
  INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (member_id, 'first_visit') ON CONFLICT DO NOTHING;
  IF counted_days >= 2 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (member_id, 'returning_visitor') ON CONFLICT DO NOTHING;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.record_member_visit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_member_visit() TO authenticated;

-- The browser sends only an achievement id: the server decides whether the
-- member is actually allowed to unlock it. Returns true when it is new.
CREATE FUNCTION public.unlock_achievement(p_achievement_id text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  member_id uuid := auth.uid();
  target_kind text;
  eligible boolean;
  inserted_count integer;
BEGIN
  IF member_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT kind INTO target_kind FROM public.achievement_catalog WHERE id = p_achievement_id;
  IF target_kind IS NULL THEN
    RAISE EXCEPTION 'Unknown achievement' USING ERRCODE = '22023';
  END IF;
  IF target_kind = 'system' THEN
    RAISE EXCEPTION 'Achievement is granted automatically' USING ERRCODE = '42501';
  END IF;
  IF target_kind = 'profile' THEN
    SELECT (display_name <> '' AND bio <> '') INTO eligible
      FROM public.profiles WHERE user_id = member_id;
    IF NOT COALESCE(eligible, false) THEN
      RETURN false;
    END IF;
  END IF;
  IF target_kind = 'review' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.product_reviews WHERE user_id = member_id
    ) INTO eligible;
    IF NOT eligible THEN
      RETURN false;
    END IF;
  END IF;
  INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (member_id, p_achievement_id) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.unlock_achievement(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_achievement(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;