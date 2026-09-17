BEGIN;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 40),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 240),
  avatar text NOT NULL DEFAULT 'robot' CHECK (avatar IN ('robot', 'rocket', 'gamepad', 'bolt')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, bio, avatar) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Edit own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TABLE public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL CHECK (achievement_id = 'first_visit'),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_achievements FROM anon, authenticated;
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
CREATE POLICY "Read own achievements" ON public.user_achievements FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- No user ID or timestamp supplied by the browser. Repeat calls are idempotent.
CREATE FUNCTION public.record_member_visit()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  member_id uuid := auth.uid();
  inserted_count integer;
BEGIN
  IF member_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.profiles (user_id) VALUES (member_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (member_id, 'first_visit') ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.record_member_visit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_member_visit() TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
