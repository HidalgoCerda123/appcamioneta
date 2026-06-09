import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Gauge, Truck, CheckCircle } from "lucide-react";
import KmRegisterForm from "@/components/odometer/KmRegisterForm";
import { todaySantiago } from "@/lib/date";

export const metadata = { title: "Registrar Kilometraje" };

export default async function RegistrarKmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Buscar el vehículo asignado al usuario (conductor)
  const { data: assignment } = await supabase
    .from("vehicle_drivers")
    .select("driver_name, vehicle:vehicles(id, brand, model, plate, current_km, usage_unit)")
    .eq("profile_id", user.id)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Si no es conductor con vehículo, mostrar mensaje
  if (!assignment?.vehicle) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Truck className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Sin vehículo asignado</h2>
        <p className="text-gray-500 text-sm mt-2">
          No tienes un vehículo asignado como conductor. Si necesitas registrar el km de un vehículo,
          ingresa a la ficha del vehículo correspondiente.
        </p>
        <Link
          href="/dashboard/vehiculos"
          className="inline-block mt-5 bg-construserv-orange text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition"
        >
          Ver vehículos
        </Link>
      </div>
    );
  }

  const veh = assignment.vehicle as unknown as {
    id: string; brand: string; model: string; plate: string; current_km: number; usage_unit: "km" | "horas";
  };
  const unitShort = veh.usage_unit === "horas" ? "h" : "km";

  // ¿Ya registró el km de hoy?
  const { data: todayReading } = await supabase
    .from("odometer_readings")
    .select("km")
    .eq("vehicle_id", veh.id)
    .eq("reading_date", todaySantiago())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
          <Gauge className="w-7 h-7 text-construserv-orange" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Registrar {veh.usage_unit === "horas" ? "Horómetro" : "Kilometraje"}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Anota cuántos {veh.usage_unit === "horas" ? "horas marca el horómetro" : "km marca tu vehículo"} hoy
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {todayReading ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-gray-900">
              Ya registraste {veh.usage_unit === "horas" ? "las horas" : "el km"} de hoy
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {veh.brand} {veh.model} — {todayReading.km.toLocaleString("es-CL")} {unitShort}
            </p>
            <p className="text-xs text-gray-400 mt-3">Vuelve mañana para registrar nuevamente. ¡Gracias!</p>
          </div>
        ) : (
          <KmRegisterForm
            vehicleId={veh.id}
            vehicleLabel={`${veh.brand} ${veh.model} — ${veh.plate}`}
            lastKm={veh.current_km ?? null}
            driverName={assignment.driver_name ?? null}
            unit={veh.usage_unit ?? "km"}
            variant="large"
          />
        )}
      </div>
    </div>
  );
}
