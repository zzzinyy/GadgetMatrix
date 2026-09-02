-- BLOG
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published posts are public" ON public.blog_posts FOR SELECT TO anon, authenticated USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage posts" ON public.blog_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TOP LISTS
CREATE TABLE public.top_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.top_lists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.top_lists TO authenticated;
GRANT ALL ON public.top_lists TO service_role;
ALTER TABLE public.top_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published lists are public" ON public.top_lists FOR SELECT TO anon, authenticated USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage lists" ON public.top_lists FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.top_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.top_lists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, product_id)
);
GRANT SELECT ON public.top_list_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.top_list_items TO authenticated;
GRANT ALL ON public.top_list_items TO service_role;
ALTER TABLE public.top_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "List items are public" ON public.top_list_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage list items" ON public.top_list_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- REVIEWS (registered users only)
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  author_name text NOT NULL DEFAULT 'Usuario',
  rating integer NOT NULL DEFAULT 5,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public" ON public.product_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create own reviews" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND rating BETWEEN 1 AND 5);
CREATE POLICY "Users update own reviews" ON public.product_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND rating BETWEEN 1 AND 5);
CREATE POLICY "Users or admins delete reviews" ON public.product_reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- PRICE HISTORY
CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX price_history_product_idx ON public.price_history (product_id, recorded_at DESC);
GRANT SELECT ON public.price_history TO anon;
GRANT SELECT ON public.price_history TO authenticated;
GRANT ALL ON public.price_history TO service_role;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price history is public" ON public.price_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage price history" ON public.price_history FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.price IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.price IS DISTINCT FROM OLD.price) THEN
    INSERT INTO public.price_history (product_id, price) VALUES (NEW.id, NEW.price);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_price_history
AFTER INSERT OR UPDATE OF price ON public.products
FOR EACH ROW EXECUTE FUNCTION public.record_price_change();

INSERT INTO public.price_history (product_id, price)
SELECT id, price FROM public.products WHERE price IS NOT NULL;

-- PRICE ALERTS
CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  target_price numeric NOT NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;
GRANT ALL ON public.price_alerts TO service_role;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own alerts" ON public.price_alerts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own alerts" ON public.price_alerts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own alerts" ON public.price_alerts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own alerts" ON public.price_alerts FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));