-- Planes de mantención preventiva: intervalos por km/horas o por días, por vehículo y tipo
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id     uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  type           text NOT NULL,            -- tipo de mantención (aceite, frenos, etc.)
  interval_value integer,                  -- intervalo en la unidad del vehículo (km u horas)
  interval_days  integer,                  -- intervalo en días (opcional)
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_vehicle ON maintenance_plans(vehicle_id);

ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados ven planes" ON maintenance_plans FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin y editor gestionan planes" ON maintenance_plans FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
);
CREATE POLICY "Admin y editor actualizan planes" ON maintenance_plans FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
);
CREATE POLICY "Admin y editor eliminan planes" ON maintenance_plans FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
);
