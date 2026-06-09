-- Lecturas de odómetro: registro manual del kilometraje real por los conductores
CREATE TABLE IF NOT EXISTS odometer_readings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  km           integer NOT NULL,
  reading_date date NOT NULL DEFAULT current_date,
  source       text NOT NULL DEFAULT 'manual',  -- 'manual' | 'maintenance' | 'document' | 'initial'
  recorded_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  driver_name  text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odometer_vehicle_date ON odometer_readings(vehicle_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_odometer_created ON odometer_readings(created_at DESC);

ALTER TABLE odometer_readings ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede ver y registrar km (incluidos conductores con rol bajo)
CREATE POLICY "Usuarios autenticados ven lecturas km"
  ON odometer_readings FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Usuarios autenticados registran km"
  ON odometer_readings FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Solo admin edita lecturas km"
  ON odometer_readings FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Solo admin elimina lecturas km"
  ON odometer_readings FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
