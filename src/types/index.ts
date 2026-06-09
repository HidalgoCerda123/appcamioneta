export type UserRole = "admin" | "editor" | "tecnico" | "viewer";

export type VehicleType =
  | "camioneta"
  | "camion"
  | "maquinaria_pesada"
  | "furgon"
  | "otro";

export type VehicleStatus = "activo" | "en_mantencion" | "fuera_de_servicio";

export type UsageUnit = "km" | "horas";

export type MaintenanceType =
  | "aceite"
  | "frenos"
  | "neumaticos"
  | "filtros"
  | "suspension"
  | "electrico"
  | "general"
  | "otro";

export type DocumentType =
  | "revision_tecnica"
  | "soap"
  | "permiso_circulacion"
  | "seguro"
  | "licencia_operador"
  | "otro";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  type: VehicleType;
  status: VehicleStatus;
  vin?: string;
  color?: string;
  current_km: number;
  usage_unit: UsageUnit;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenancePart {
  name: string;
  brand?: string;
  part_number?: string;
  quantity: number;
  unit_cost: number;
  warranty_months?: number;
}

export interface Maintenance {
  id: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  date: string;
  km_at_service: number;
  type: MaintenanceType;
  subcategory?: string;
  workshop_name: string;
  workshop_address?: string;
  workshop_phone?: string;
  description: string;
  parts_replaced: MaintenancePart[];
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  invoice_urls: string[];
  photo_urls: string[];
  next_service_km?: number;
  next_service_date?: string;
  performed_by?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  type: DocumentType;
  label: string;
  issue_date?: string;
  expiry_date: string;
  document_url?: string;
  amount_paid?: number;
  issuer?: string;
  policy_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationConfig {
  id: string;
  user_id: string;
  vehicle_id?: string;
  type: "maintenance_km" | "maintenance_date" | "document_expiry";
  channel_email: boolean;
  channel_whatsapp: boolean;
  channel_push: boolean;
  days_before_document: number[];
  km_before_maintenance: number;
  is_active: boolean;
}

export interface DashboardStats {
  total_vehicles: number;
  active_vehicles: number;
  in_maintenance: number;
  total_spend_year: number;
  upcoming_maintenances: number;
  expiring_documents: number;
}
