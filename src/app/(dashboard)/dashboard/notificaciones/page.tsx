import { createClient } from "@/lib/supabase/server";
import NotificationsConfig from "@/components/notifications/NotificationsConfig";

export const metadata = { title: "Notificaciones" };

export default async function NotificationsPage() {
  const supabase = await createClient();

  // Todos los perfiles registrados
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("full_name");

  // Configs existentes en notification_configs (una por usuario admin/editor)
  const { data: configs } = await supabase
    .from("notification_configs")
    .select("id, user_id, email, is_active, days_before")
    .not("user_id", "is", null);

  // Conductores activos con cuenta de usuario vinculada
  const { data: linkedDriversRaw } = await supabase
    .from("vehicle_drivers")
    .select("driver_name, license_expiry, profile_id, vehicle:vehicles(plate, brand, model)")
    .is("end_date", null)
    .not("profile_id", "is", null);

  // Obtener emails de los perfiles vinculados
  const profileIds = (linkedDriversRaw ?? []).map((d) => d.profile_id).filter(Boolean) as string[];
  const { data: linkedProfiles } = profileIds.length > 0
    ? await supabase.from("profiles").select("id, email").in("id", profileIds)
    : { data: [] };

  const profileEmailMap: Record<string, string> = {};
  for (const p of linkedProfiles ?? []) profileEmailMap[p.id] = p.email;

  const linkedDrivers = (linkedDriversRaw ?? []).map((d) => {
    const veh = d.vehicle as { plate: string; brand: string; model: string } | null;
    return {
      driver_name: d.driver_name,
      vehicle_plate: veh?.plate ?? "",
      vehicle_brand: veh?.brand ?? "",
      vehicle_model: veh?.model ?? "",
      profile_email: profileEmailMap[d.profile_id ?? ""] ?? "",
    };
  });

  // Historial reciente
  const { data: logs } = await supabase
    .from("notification_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <NotificationsConfig
      adminProfiles={allProfiles ?? []}
      configs={(configs ?? []) as { id: string; user_id: string; email: string; is_active: boolean; days_before: number[] }[]}
      linkedDrivers={linkedDrivers}
      logs={logs ?? []}
    />
  );
}
