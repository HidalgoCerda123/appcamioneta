import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck, Truck, CheckCircle } from "lucide-react";
import InspectionForm from "@/components/inspections/InspectionForm";
import { todaySantiago } from "@/lib/date";

export const metadata = { title: "Inspección Pre-Uso" };

export default async function InspectionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("vehicle_drivers")
    .select("driver_name, vehicle:vehicles(id, plate, brand, model)")
    .eq("profile_id", user.id)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment?.vehicle) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Truck className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Sin vehículo asignado</h2>
        <p className="text-gray-500 text-sm mt-2">
          La inspección pre-uso la realiza el conductor asignado a un vehículo.
        </p>
        <Link href="/dashboard/vehiculos" className="inline-block mt-5 bg-construserv-orange text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
          Ver vehículos
        </Link>
      </div>
    );
  }

  const veh = assignment.vehicle as unknown as { id: string; plate: string; brand: string; model: string };

  // ¿Ya hizo la inspección de hoy?
  const { data: todayInspection } = await supabase
    .from("inspections")
    .select("id, has_issues")
    .eq("vehicle_id", veh.id)
    .eq("inspection_date", todaySantiago())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
          <ClipboardCheck className="w-7 h-7 text-construserv-orange" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Inspección Pre-Uso</h2>
        <p className="text-gray-500 text-sm mt-1">{veh.brand} {veh.model} — {veh.plate}</p>
      </div>

      {todayInspection ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <p className="font-semibold text-gray-900">Ya hiciste la inspección de hoy</p>
          <p className="text-gray-500 text-sm mt-1">
            {todayInspection.has_issues ? "Se registraron observaciones." : "Sin problemas detectados."}
          </p>
        </div>
      ) : (
        <InspectionForm vehicleId={veh.id} vehicleLabel={`${veh.brand} ${veh.model} — ${veh.plate}`} driverName={assignment.driver_name ?? null} />
      )}
    </div>
  );
}
