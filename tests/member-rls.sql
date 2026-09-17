-- Run after 0007_member_profiles.sql. Fixtures are always rolled back.
BEGIN;
INSERT INTO auth.users (id) VALUES
  ('8b811d15-92ca-4b7f-aad0-8dbedc7ca111'),
  ('8b811d15-92ca-4b7f-aad0-8dbedc7ca222');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '8b811d15-92ca-4b7f-aad0-8dbedc7ca111', true);
DO $$ BEGIN
  IF public.record_member_visit() IS NOT TRUE THEN RAISE EXCEPTION 'First visit missing'; END IF;
  IF public.record_member_visit() IS NOT FALSE THEN RAISE EXCEPTION 'Duplicate achievement'; END IF;
END $$;
UPDATE public.profiles SET display_name = 'Test member', bio = 'Temporary', avatar = 'rocket';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.user_achievements) <> 1 THEN RAISE EXCEPTION 'Wrong count'; END IF;
  IF (SELECT display_name FROM public.profiles) <> 'Test member' THEN RAISE EXCEPTION 'Save failed'; END IF;
  BEGIN
    UPDATE public.profiles SET avatar = 'invalid';
    RAISE EXCEPTION 'Invalid avatar accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (auth.uid(), 'first_visit');
    RAISE EXCEPTION 'Direct achievement write allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub', '8b811d15-92ca-4b7f-aad0-8dbedc7ca222', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles) OR EXISTS (SELECT 1 FROM public.user_achievements)
    THEN RAISE EXCEPTION 'Cross-user read allowed'; END IF;
  UPDATE public.profiles SET display_name = 'Wrong user';
  IF FOUND THEN RAISE EXCEPTION 'Cross-user update allowed'; END IF;
  PERFORM public.record_member_visit();
  IF (SELECT display_name FROM public.profiles) <> '' THEN RAISE EXCEPTION 'Wrong profile'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $$ BEGIN
  BEGIN
    PERFORM public.record_member_visit();
    RAISE EXCEPTION 'Missing identity allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.record_member_visit();
    RAISE EXCEPTION 'Anonymous call allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'Member isolation, persistence, validation and idempotency passed' AS result;
ROLLBACK;
