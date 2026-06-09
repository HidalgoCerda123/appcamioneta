-- Fase 2 — Operación en terreno: reportes de falla e inspecciones pre-uso

CREATE TABLE IF NOT EXISTS fault_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  reported_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  driver_name     text,
  title           text NOT NULL,
  description     text,
  severity        text NOT NULL DEFAULT 'media' CHECK (severity IN ('baja','media','alta')),
  status          text NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta','en_proceso','resuelta')),
  photo_urls      text[] DEFAULT '{}',
  resolution_note text,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fault_reports_vehicle ON fault_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fault_reports_status ON fault_reports(status, created_at DESC);
ALTER TABLE fault_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven fallas" ON fault_reports FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Autenticados reportan fallas" ON fault_reports FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Admin y editor actualizan fallas" ON fault_reports FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
);
CREATE POLICY "Solo admin elimina fallas" ON fault_reports FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE TABLE IF NOT EXISTS inspections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  profile_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  driver_name     text,
  inspection_date date NOT NULL DEFAULT current_date,
  items           jsonb NOT NULL DEFAULT '[]',
  photo_urls      text[] DEFAULT '{}',
  has_issues      boolean NOT NULL DEFAULT false,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_date ON inspections(vehicle_id, inspection_date DESC);
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven inspecciones" ON inspections FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Autenticados crean inspecciones" ON inspections FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Solo admin edita inspecciones" ON inspections FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Solo admin elimina inspecciones" ON inspections FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
