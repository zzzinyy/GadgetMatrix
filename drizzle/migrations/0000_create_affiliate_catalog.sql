-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  brand text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric(10,2),
  currency text NOT NULL DEFAULT 'EUR',
  image_url text,
  amazon_url text NOT NULL,
  rating numeric(2,1),
  pros text[] NOT NULL DEFAULT '{}',
  cons text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products(category_id);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are public" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Technical specs
CREATE TABLE public.product_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_specs_product_idx ON public.product_specs(product_id);
GRANT SELECT ON public.product_specs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_specs TO authenticated;
GRANT ALL ON public.product_specs TO service_role;
ALTER TABLE public.product_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specs are public" ON public.product_specs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage specs" ON public.product_specs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Site settings (affiliate tag)
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are public" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (key, value) VALUES ('amazon_affiliate_tag', 'mitienda-21');

-- Seed categories
INSERT INTO public.categories (slug, name, description) VALUES
('auriculares', 'Auriculares', 'Auriculares inalámbricos, con cancelación de ruido y para deporte.'),
('portatiles', 'Portátiles', 'Ordenadores portátiles para trabajo, estudio y gaming.'),
('smartwatches', 'Smartwatches', 'Relojes inteligentes y pulseras de actividad.'),
('accesorios', 'Accesorios', 'Cargadores, teclados, ratones y periféricos.');

-- Seed products
INSERT INTO public.products (slug, name, brand, category_id, short_description, description, price, image_url, amazon_url, rating, pros, cons, featured) VALUES
('auriculares-anc-pro', 'Auriculares ANC Pro', 'Sonora', (SELECT id FROM public.categories WHERE slug='auriculares'),
 'Cancelación activa de ruido y 40 h de batería.',
 'Los Auriculares ANC Pro combinan una cancelación activa de ruido híbrida con drivers de 40 mm para un sonido equilibrado. Su diadema acolchada y sus almohadillas de espuma viscoelástica permiten sesiones largas sin fatiga, y el modo transparencia deja pasar el sonido ambiente cuando lo necesitas.',
 179.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
 'https://www.amazon.es/dp/B08PZHYWJS', 4.6,
 ARRAY['ANC muy efectivo','Batería de 40 horas','Multipunto Bluetooth'], ARRAY['Algo pesados','Sin resistencia al agua'], true),
('portatil-ultra-14', 'Ultrabook 14" Core i7', 'Nordika', (SELECT id FROM public.categories WHERE slug='portatiles'),
 'Ultrabook de 1,2 kg con pantalla OLED y 16 GB de RAM.',
 'Un portátil pensado para moverse: chasis de aluminio de 1,2 kg, pantalla OLED de 14 pulgadas a 90 Hz y hasta 12 horas de autonomía real. El procesador de última generación y los 16 GB de RAM lo hacen solvente para ofimática, edición ligera y desarrollo.',
 1099.00, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
 'https://www.amazon.es/dp/B0BSLQ8Z1F', 4.4,
 ARRAY['Pantalla OLED excelente','Muy ligero','Carga rápida USB-C'], ARRAY['Pocos puertos','Altavoces mejorables'], true),
('smartwatch-fit-s3', 'Smartwatch Fit S3', 'Pulsar', (SELECT id FROM public.categories WHERE slug='smartwatches'),
 'GPS, ECG y 14 días de autonomía.',
 'El Fit S3 mide frecuencia cardíaca, SpO2 y calidad del sueño con sensores de nueva generación. Incluye GPS integrado, más de 100 modos deportivos y resistencia 5 ATM, con una autonomía de hasta 14 días en uso normal.',
 149.90, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
 'https://www.amazon.es/dp/B09XKZ8YQD', 4.3,
 ARRAY['Autonomía enorme','GPS preciso','Pantalla AMOLED'], ARRAY['App algo básica','Sin pago NFC'], false),
('teclado-mecanico-tkl', 'Teclado Mecánico TKL', 'Klavio', (SELECT id FROM public.categories WHERE slug='accesorios'),
 'Switches hot-swap, inalámbrico y retroiluminado.',
 'Teclado compacto tenkeyless con switches intercambiables en caliente, triple conectividad (USB-C, Bluetooth y receptor 2,4 GHz) y estructura con espuma para un sonido más profundo. Ideal para escritorios pequeños y para quienes escriben muchas horas.',
 89.99, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
 'https://www.amazon.es/dp/B0C4KXQ5T1', 4.7,
 ARRAY['Hot-swap sin herramientas','Triple conectividad','Muy buen tacto'], ARRAY['Sin reposamuñecas'], true);

-- Seed specs
INSERT INTO public.product_specs (product_id, label, value, position) VALUES
((SELECT id FROM public.products WHERE slug='auriculares-anc-pro'), 'Tipo', 'Circumaurales cerrados', 1),
((SELECT id FROM public.products WHERE slug='auriculares-anc-pro'), 'Conectividad', 'Bluetooth 5.3 + jack 3,5 mm', 2),
((SELECT id FROM public.products WHERE slug='auriculares-anc-pro'), 'Batería', '40 h (30 h con ANC)', 3),
((SELECT id FROM public.products WHERE slug='auriculares-anc-pro'), 'Peso', '278 g', 4),
((SELECT id FROM public.products WHERE slug='portatil-ultra-14'), 'Pantalla', '14" OLED 2880x1800 90 Hz', 1),
((SELECT id FROM public.products WHERE slug='portatil-ultra-14'), 'Memoria', '16 GB LPDDR5', 2),
((SELECT id FROM public.products WHERE slug='portatil-ultra-14'), 'Almacenamiento', 'SSD NVMe 1 TB', 3),
((SELECT id FROM public.products WHERE slug='portatil-ultra-14'), 'Peso', '1,2 kg', 4),
((SELECT id FROM public.products WHERE slug='smartwatch-fit-s3'), 'Pantalla', 'AMOLED 1,43"', 1),
((SELECT id FROM public.products WHERE slug='smartwatch-fit-s3'), 'Autonomía', 'Hasta 14 días', 2),
((SELECT id FROM public.products WHERE slug='smartwatch-fit-s3'), 'Resistencia', '5 ATM', 3),
((SELECT id FROM public.products WHERE slug='teclado-mecanico-tkl'), 'Formato', 'TKL 87 teclas', 1),
((SELECT id FROM public.products WHERE slug='teclado-mecanico-tkl'), 'Switches', 'Lineales hot-swap', 2),
((SELECT id FROM public.products WHERE slug='teclado-mecanico-tkl'), 'Conectividad', 'USB-C / BT 5.1 / 2,4 GHz', 3);