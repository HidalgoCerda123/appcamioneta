-- Tabla de auditoría: registra quién hizo qué y cuándo
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_name   text,
  action      text NOT NULL,        -- 'create' | 'update' | 'delete'
  entity      text NOT NULL,        -- 'vehicle' | 'maintenance' | 'document' | 'driver'
  entity_id   text,
  description text NOT NULL,        -- Descripción legible del cambio
  metadata    jsonb                 -- Datos adicionales (valores antes/después)
);

-- Índices para consultas frecuentes
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity     ON audit_log(entity, entity_id);

-- RLS: solo admins pueden ver el log completo; cada usuario ve sus propias acciones
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins ven todo el audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Usuarios ven sus propias acciones"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Solo el sistema puede insertar"
  ON audit_log FOR INSERT
  WITH CHECK (true);
