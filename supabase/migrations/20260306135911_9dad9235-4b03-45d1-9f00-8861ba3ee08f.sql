CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT 'false'::jsonb,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.app_settings (key, value) VALUES ('maintenance_mode', 'false'::jsonb);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);