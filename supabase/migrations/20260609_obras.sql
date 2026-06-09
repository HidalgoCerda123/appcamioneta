-- Fase 3 — Obras / faenas y asignación de vehículos a proyectos
CREATE TABLE IF NOT EXISTS projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  client      text,
  location    text,
  status      text NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','finalizada')),
  start_date  date,
  end_date    date,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS project_vehicles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  vehicle_id  uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  start_date  date NOT NULL DEFAULT current_date,
  end_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_vehicles_project ON project_vehicles(project_id);
CREATE INDEX IF NOT EXISTS idx_project_vehicles_vehicle ON project_vehicles(vehicle_id);
ALTER TABLE project_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven obras" ON projects FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin y editor gestionan obras" ON projects FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admin y editor actualizan obras" ON projects FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Solo admin elimina obras" ON projects FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Autenticados ven asignaciones obra" ON project_vehicles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin y editor gestionan asignaciones obra" ON project_vehicles FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admin y editor actualizan asignaciones obra" ON project_vehicles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
CREATE POLICY "Admin y editor eliminan asignaciones obra" ON project_vehicles FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
