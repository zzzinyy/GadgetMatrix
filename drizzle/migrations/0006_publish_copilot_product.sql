-- Run once in Supabase SQL Editor before deploying admin-copilot.
-- Invoker privileges retain existing RLS. No service-role key is needed.
CREATE OR REPLACE FUNCTION public.publish_copilot_product(p_request_id uuid, p_draft jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing public.products%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator required' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL OR jsonb_typeof(p_draft) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid product';
  END IF;
  -- Serialize retries of the same publication, including concurrent double clicks.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  SELECT * INTO v_existing FROM public.products WHERE id = p_request_id;
  IF FOUND THEN
    IF v_existing.slug IS DISTINCT FROM p_draft->>'slug' THEN
      RAISE EXCEPTION 'Publication identifier already used';
    END IF;
    RETURN v_existing.id;
  END IF;
  IF coalesce(length(p_draft->>'name'), 0) NOT BETWEEN 2 AND 120
    OR coalesce(p_draft->>'slug', '') !~ '^[a-z0-9-]{2,80}$'
    OR coalesce(p_draft->>'amazon_url', '') !~ '^https://(www\.)?(amazon\.(es|com|de|fr|it|co\.uk)|amzn\.to)/'
    OR length(p_draft->>'amazon_url') > 500
    OR coalesce(p_draft->>'currency', 'EUR') <> 'EUR'
    OR (p_draft->>'price')::numeric NOT BETWEEN 0 AND 1000000
    OR (p_draft->>'rating')::numeric NOT BETWEEN 0 AND 5
    OR coalesce(length(p_draft->>'description'), 0) > 5000
    OR coalesce(length(p_draft->>'short_description'), 0) > 200
    OR jsonb_typeof(p_draft->'specs') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_draft->'specs') > 50 THEN
    RAISE EXCEPTION 'Invalid product fields';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_draft->'specs') s
    WHERE coalesce(length(trim(s->>'label')), 0) NOT BETWEEN 1 AND 100
       OR coalesce(length(trim(s->>'value')), 0) NOT BETWEEN 1 AND 500) THEN
    RAISE EXCEPTION 'Invalid specifications';
  END IF;
  -- INSERT only: a conflicting slug never overwrites an existing product.
  INSERT INTO public.products (id, name, slug, brand, category_id, short_description,
    description, price, currency, image_url, amazon_url, rating, featured, pros, cons)
  VALUES (p_request_id, p_draft->>'name', p_draft->>'slug', nullif(p_draft->>'brand', ''),
    nullif(p_draft->>'category_id', '')::uuid, coalesce(p_draft->>'short_description', ''),
    coalesce(p_draft->>'description', ''), (p_draft->>'price')::numeric, 'EUR',
    nullif(p_draft->>'image_url', ''), p_draft->>'amazon_url', (p_draft->>'rating')::numeric,
    coalesce((p_draft->>'featured')::boolean, false),
    ARRAY(SELECT jsonb_array_elements_text(p_draft->'pros')),
    ARRAY(SELECT jsonb_array_elements_text(p_draft->'cons')));
  INSERT INTO public.product_specs (product_id, label, value, position)
    SELECT p_request_id, s->>'label', s->>'value', ord::integer
    FROM jsonb_array_elements(p_draft->'specs') WITH ORDINALITY AS specs(s, ord);
  RETURN p_request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_copilot_product(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_copilot_product(uuid, jsonb) TO authenticated;
