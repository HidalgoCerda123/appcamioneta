-- Combustible: cargas por vehículo + vista de resumen (gasto por km, rendimiento)
CREATE TABLE IF NOT EXISTS fuel_loads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  fuel_date    date NOT NULL DEFAULT current_date,
  liters       numeric(10,2) NOT NULL,
  total_cost   integer NOT NULL DEFAULT 0,
  km_at_load   integer,
  station      text,
  driver_name  text,
  recorded_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fuel_loads_vehicle_date ON fuel_loads(vehicle_id, fuel_date DESC);
ALTER TABLE fuel_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven cargas" ON fuel_loads FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Autenticados registran cargas" ON fuel_loads FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Admin y editor actualizan cargas" ON fuel_loads FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Solo admin elimina cargas" ON fuel_loads FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE OR REPLACE VIEW fuel_summary
WITH (security_invoker = true) AS
SELECT
  vehicle_id,
  count(*)        AS loads,
  sum(liters)     AS total_liters,
  sum(total_cost) AS total_cost,
  min(km_at_load) AS min_km,
  max(km_at_load) AS max_km
FROM fuel_loads
WHERE km_at_load IS NOT NULL
GROUP BY vehicle_id;
