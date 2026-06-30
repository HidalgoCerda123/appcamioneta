-- Fix: el rediseño de notificaciones usa columnas que faltaban en notification_configs
-- (email + flags notify_*), y 'type' era NOT NULL impidiendo los inserts del toggle.
ALTER TABLE notification_configs ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE notification_configs ALTER COLUMN type DROP NOT NULL;
ALTER TABLE notification_configs ADD COLUMN IF NOT EXISTS notify_doc_expiry boolean DEFAULT true;
ALTER TABLE notification_configs ADD COLUMN IF NOT EXISTS notify_maintenance boolean DEFAULT true;
ALTER TABLE notification_configs ADD COLUMN IF NOT EXISTS notify_license_expiry boolean DEFAULT true;
ALTER TABLE notification_configs ADD COLUMN IF NOT EXISTS notify_own_vehicle_only boolean DEFAULT false;
