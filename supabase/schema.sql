-- ============================================================
-- Flotapp — Esquema de Base de Datos
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: profiles (extiende auth.users de Supabase)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'tecnico', 'viewer')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: vehicles
-- ============================================================
CREATE TABLE vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'camioneta' CHECK (type IN ('camioneta', 'camion', 'maquinaria_pesada', 'furgon', 'otro')),
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'en_mantencion', 'fuera_de_servicio')),
  vin TEXT,
  color TEXT,
  current_km INTEGER NOT NULL DEFAULT 0,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: maintenances
-- ============================================================
CREATE TABLE maintenances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  km_at_service INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('aceite', 'frenos', 'neumaticos', 'filtros', 'suspension', 'electrico', 'general', 'otro')),
  workshop_name TEXT NOT NULL,
  workshop_address TEXT,
  workshop_phone TEXT,
  description TEXT NOT NULL,
  parts_replaced JSONB NOT NULL DEFAULT '[]',
  labor_cost INTEGER NOT NULL DEFAULT 0,
  parts_cost INTEGER NOT NULL DEFAULT 0,
  total_cost INTEGER NOT NULL DEFAULT 0,
  invoice_urls TEXT[] DEFAULT '{}',
  photo_urls TEXT[] DEFAULT '{}',
  next_service_km INTEGER,
  next_service_date DATE,
  performed_by TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: vehicle_documents
-- ============================================================
CREATE TABLE vehicle_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('revision_tecnica', 'soap', 'permiso_circulacion', 'seguro', 'licencia_operador', 'otro')),
  label TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  document_url TEXT,
  amount_paid INTEGER,
  issuer TEXT,
  policy_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: notification_configs
-- ============================================================
CREATE TABLE notification_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('maintenance_km', 'maintenance_date', 'document_expiry')),
  channel_email BOOLEAN DEFAULT TRUE,
  channel_whatsapp BOOLEAN DEFAULT FALSE,
  channel_push BOOLEAN DEFAULT TRUE,
  days_before_document INTEGER[] DEFAULT '{30,15,7,1}',
  km_before_maintenance INTEGER DEFAULT 500,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: notification_log (historial de notificaciones enviadas)
-- ============================================================
CREATE TABLE notification_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  document_id UUID REFERENCES vehicle_documents(id),
  maintenance_id UUID REFERENCES maintenances(id),
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenances_updated_at BEFORE UPDATE ON maintenances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
CREATE POLICY "Usuarios ven su propio perfil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin ve todos los perfiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Usuarios actualizan su propio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin actualiza cualquier perfil" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policies: vehicles (todos los usuarios autenticados pueden ver, solo admin/editor pueden editar)
CREATE POLICY "Usuarios autenticados ven vehículos" ON vehicles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin y editor insertan vehículos" ON vehicles FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Admin y editor actualizan vehículos" ON vehicles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Solo admin elimina vehículos" ON vehicles FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policies: maintenances
CREATE POLICY "Usuarios autenticados ven mantenciones" ON maintenances FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin, editor y tecnico insertan mantenciones" ON maintenances FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'tecnico'))
);
CREATE POLICY "Admin y editor actualizan mantenciones" ON maintenances FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Solo admin elimina mantenciones" ON maintenances FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policies: vehicle_documents
CREATE POLICY "Usuarios autenticados ven documentos" ON vehicle_documents FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin y editor gestionan documentos" ON vehicle_documents FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Admin y editor actualizan documentos" ON vehicle_documents FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Solo admin elimina documentos" ON vehicle_documents FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policies: notification_configs
CREATE POLICY "Usuarios ven sus propias configs" ON notification_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus propias configs" ON notification_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios actualizan sus propias configs" ON notification_configs FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('maintenance-files', 'maintenance-files', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', FALSE);

CREATE POLICY "Usuarios autenticados suben archivos de mantención"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'maintenance-files');

CREATE POLICY "Archivos de mantención son públicos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'maintenance-files');

CREATE POLICY "Usuarios autenticados suben fotos de vehículos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-photos');

CREATE POLICY "Fotos de vehículos son públicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Usuarios autenticados gestionan documentos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents');
