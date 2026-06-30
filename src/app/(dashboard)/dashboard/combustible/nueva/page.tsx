import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FuelLoadForm from "@/components/fuel/FuelLoadForm";

export const metadata = { title: "Registrar Combustible" };

export default async function NewFuelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("vehicle_drivers")
    .select("driver_name, vehicle:vehicles(id, plate, brand, model, current_km, usage_unit)")
    .eq("profile_id", user.id)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let fixedVehicleId: string | undefined;
  let driverName: string | null = null;
  let vehicles: { id: string; plate: string; brand: string; model: string; current_km?: number; usage_unit?: "km" | "horas" }[] = [];

  if (assignment?.vehicle) {
    const veh = assignment.vehicle as unknown as { id: string; plate: string; brand: string; model: string; current_km: number; usage_unit: "km" | "horas" };
    fixedVehicleId = veh.id;
    driverName = assignment.driver_name ?? null;
    vehicles = [veh];
  } else {
    const { data } = await supabase.from("vehicles").select("id, plate, brand, model, current_km, usage_unit").order("brand");
    vehicles = data ?? [];
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/combustible" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registrar Combustible</h2>
          <p className="text-gray-500 text-sm mt-0.5">Anota cada carga con su kilometraje para medir el gasto por km</p>
        </div>
      </div>
      <FuelLoadForm vehicles={vehicles} fixedVehicleId={fixedVehicleId} driverName={driverName} />
    </div>
  );
}
