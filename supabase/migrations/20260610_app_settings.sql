-- Configuración global de la app (margen de aviso de mantención por km/horas)
CREATE TABLE IF NOT EXISTS app_settings (
  id                 text PRIMARY KEY DEFAULT 'global',
  km_service_lead    integer NOT NULL DEFAULT 200,
  hours_service_lead integer NOT NULL DEFAULT 20,
  updated_at         timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven settings" ON app_settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Solo admin edita settings" ON app_settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
