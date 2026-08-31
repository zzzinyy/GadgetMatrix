CREATE TABLE public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','card_click','affiliate_click')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_events_product_idx ON public.product_events (product_id);
CREATE INDEX product_events_created_idx ON public.product_events (created_at DESC);

GRANT INSERT ON public.product_events TO anon, authenticated;
GRANT SELECT ON public.product_events TO authenticated;
GRANT ALL ON public.product_events TO service_role;

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log events"
  ON public.product_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read events"
  ON public.product_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
