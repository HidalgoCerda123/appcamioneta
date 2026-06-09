import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import KmCheckInGate from "@/components/odometer/KmCheckInGate";
import { todaySantiago } from "@/lib/date";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Contar alertas activas para el badge de la campana
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [{ count: docsCount }, { count: licCount }, { count: maintCount }] = await Promise.all([
    supabase.from("vehicle_documents").select("id", { count: "exact", head: true }).lte("expiry_date", in30),
    supabase.from("vehicle_drivers").select("id", { count: "exact", head: true }).is("end_date", null).not("license_expiry", "is", null).lte("license_expiry", in30),
    supabase.from("maintenances").select("id", { count: "exact", head: true }).not("next_service_date", "is", null).lte("next_service_date", in30),
  ]);
  const alertCount = (docsCount ?? 0) + (licCount ?? 0) + (maintCount ?? 0);

  // Si el usuario es conductor con vehículo asignado, verificar si registró el km de hoy
  let kmCheckIn: {
    vehicleId: string;
    vehicleLabel: string;
    lastKm: number | null;
    driverName: string | null;
    unit: "km" | "horas";
  } | null = null;

  const { data: assignment } = await supabase
    .from("vehicle_drivers")
    .select("driver_name, vehicle:vehicles(id, brand, model, plate, current_km, usage_unit)")
    .eq("profile_id", user.id)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignment?.vehicle) {
    const veh = assignment.vehicle as unknown as {
      id: string; brand: string; model: string; plate: string; current_km: number; usage_unit: "km" | "horas";
    };
    const { count: readingToday } = await supabase
      .from("odometer_readings")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", veh.id)
      .eq("reading_date", todaySantiago());

    if (!readingToday || readingToday === 0) {
      kmCheckIn = {
        vehicleId: veh.id,
        vehicleLabel: `${veh.brand} ${veh.model} — ${veh.plate}`,
        lastKm: veh.current_km ?? null,
        driverName: assignment.driver_name ?? null,
        unit: veh.usage_unit ?? "km",
      };
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar profile={profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header profile={profile} alertCount={alertCount} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav profile={profile} />
      {kmCheckIn && (
        <KmCheckInGate
          vehicleId={kmCheckIn.vehicleId}
          vehicleLabel={kmCheckIn.vehicleLabel}
          lastKm={kmCheckIn.lastKm}
          driverName={kmCheckIn.driverName}
          unit={kmCheckIn.unit}
        />
      )}
    </div>
  );
}
