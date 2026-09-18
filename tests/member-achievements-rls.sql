-- Run after 0008_member_achievements.sql. Fixtures are always rolled back.
BEGIN;
INSERT INTO auth.users (id) VALUES
  ('c1a5e0f0-0f4f-4a1b-9d3f-000000000111'),
  ('c1a5e0f0-0f4f-4a1b-9d3f-000000000222');

-- The catalog is public (labels only) and read-only for visitors.
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.achievement_catalog) < 10 THEN
    RAISE EXCEPTION 'Catalog not readable';
  END IF;
  BEGIN
    INSERT INTO public.achievement_catalog (id, emoji, title, description, kind, sort_order)
      VALUES ('hacked', 'x', 'Hacked', 'Hacked entry', 'route', 999);
    RAISE EXCEPTION 'Anonymous catalog write allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1a5e0f0-0f4f-4a1b-9d3f-000000000111', true);
DO $$ BEGIN
  IF public.record_member_visit() IS NOT TRUE THEN RAISE EXCEPTION 'First day not counted'; END IF;
  IF public.record_member_visit() IS NOT FALSE THEN RAISE EXCEPTION 'Same day counted twice'; END IF;
  IF (SELECT days_visited FROM public.profiles) <> 1 THEN RAISE EXCEPTION 'Wrong days_visited'; END IF;
  IF (SELECT last_visit_on FROM public.profiles) <> (now() AT TIME ZONE 'utc')::date THEN
    RAISE EXCEPTION 'Wrong last_visit_on';
  END IF;
  IF (SELECT count(*) FROM public.user_achievements) <> 1 THEN
    RAISE EXCEPTION 'Unexpected achievements after first visit';
  END IF;
END $$;

-- Navigation achievements: the server validates id and kind.
DO $$ BEGIN
  IF public.unlock_achievement('explore_catalog') IS NOT TRUE THEN
    RAISE EXCEPTION 'Route achievement not granted';
  END IF;
  IF public.unlock_achievement('explore_catalog') IS NOT FALSE THEN
    RAISE EXCEPTION 'Duplicate achievement granted';
  END IF;
  BEGIN
    PERFORM public.unlock_achievement('first_visit');
    RAISE EXCEPTION 'System achievement self-granted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.unlock_achievement('no_existe');
    RAISE EXCEPTION 'Unknown achievement accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF public.unlock_achievement('profile_complete') IS NOT FALSE THEN
    RAISE EXCEPTION 'Incomplete profile unlocked';
  END IF;
  IF public.unlock_achievement('first_review') IS NOT FALSE THEN
    RAISE EXCEPTION 'Review achievement granted without review';
  END IF;
END $$;

-- Profile achievement needs a saved name and bio.
UPDATE public.profiles SET display_name = 'Ada Lovelace', bio = 'Analista de gadgets.';
DO $$ BEGIN
  IF public.unlock_achievement('profile_complete') IS NOT TRUE THEN
    RAISE EXCEPTION 'Complete profile not unlocked';
  END IF;
END $$;

-- Review achievement needs an actual review from the member.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.products) THEN
    INSERT INTO public.product_reviews (product_id, user_id, author_name, rating, title, body)
      SELECT id, auth.uid(), 'Ada', 5, 'Muy bueno', 'Reseña temporal.' FROM public.products LIMIT 1;
    IF public.unlock_achievement('first_review') IS NOT TRUE THEN
      RAISE EXCEPTION 'Review achievement not granted';
    END IF;
  END IF;
END $$;

-- Members never write system counters or achievements directly.
DO $$ BEGIN
  BEGIN
    UPDATE public.profiles SET days_visited = 999;
    RAISE EXCEPTION 'Member wrote system counters';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (auth.uid(), 'quiz_master');
    RAISE EXCEPTION 'Direct achievement write allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Simulate the next day as the table owner, then check the returning visitor.
RESET ROLE;
UPDATE public.profiles SET last_visit_on = (now() AT TIME ZONE 'utc')::date - 1
  WHERE user_id = 'c1a5e0f0-0f4f-4a1b-9d3f-000000000111';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1a5e0f0-0f4f-4a1b-9d3f-000000000111', true);
DO $$ BEGIN
  IF public.record_member_visit() IS NOT TRUE THEN RAISE EXCEPTION 'Second day not counted'; END IF;
  IF (SELECT days_visited FROM public.profiles) <> 2 THEN RAISE EXCEPTION 'Wrong days_visited'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE achievement_id = 'returning_visitor') THEN
    RAISE EXCEPTION 'Returning visitor missing';
  END IF;
END $$;

-- A second member starts from scratch and never sees the first one.
SELECT set_config('request.jwt.claim.sub', 'c1a5e0f0-0f4f-4a1b-9d3f-000000000222', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.user_achievements) THEN
    RAISE EXCEPTION 'Cross-user achievements visible';
  END IF;
  IF public.record_member_visit() IS NOT TRUE THEN RAISE EXCEPTION 'Second member visit not counted'; END IF;
  IF (SELECT count(*) FROM public.user_achievements) <> 1 THEN
    RAISE EXCEPTION 'Second member achievements wrong';
  END IF;
END $$;

-- Anonymous visitors can neither visit nor unlock.
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.unlock_achievement('explore_catalog');
    RAISE EXCEPTION 'Anonymous unlock allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.record_member_visit();
    RAISE EXCEPTION 'Anonymous visit allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'Achievement catalog, unlock rules and visit counters passed' AS result;
ROLLBACK;