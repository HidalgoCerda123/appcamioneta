-- Vincular la lectura de odómetro con la carga de combustible que la generó,
-- para poder sincronizarla/eliminarla al editar o borrar la carga.
ALTER TABLE odometer_readings ADD COLUMN IF NOT EXISTS fuel_load_id uuid REFERENCES fuel_loads(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_odometer_fuel_load ON odometer_readings(fuel_load_id);

-- Permitir a admin y editor editar/eliminar lecturas (antes solo admin)
DROP POLICY IF EXISTS "Solo admin edita lecturas km" ON odometer_readings;
DROP POLICY IF EXISTS "Solo admin elimina lecturas km" ON odometer_readings;
CREATE POLICY "Admin y editor editan lecturas km" ON odometer_readings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admin y editor eliminan lecturas km" ON odometer_readings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
