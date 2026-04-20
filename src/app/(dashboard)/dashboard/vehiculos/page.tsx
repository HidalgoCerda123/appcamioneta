import { createClient } from "@/lib/supabase/server";
import { Plus, Truck } from "lucide-react";
import Link from "next/link";
import VehicleCard from "@/components/vehicles/VehicleCard";
import type { Vehicle } from "@/types";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("vehicles").select("*").order("brand");

  if (params.status) query = query.eq("status", params.status);
  if (params.type) query = query.eq("type", params.type);

  const [{ data: vehicles }, { data: activeDrivers }] = await Promise.all([
    query,
    supabase.from("vehicle_drivers").select("vehicle_id, driver_name").is("end_date", null),
  ]);

  const filtered = params.q
    ? (vehicles ?? []).filter(
        (v) =>
          v.plate.toLowerCase().includes(params.q!.toLowerCase()) ||
          v.brand.toLowerCase().includes(params.q!.toLowerCase()) ||
          v.model.toLowerCase().includes(params.q!.toLowerCase())
      )
    : (vehicles ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vehículos</h2>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} vehículos registrados</p>
        </div>
        <Link
          href="/dashboard/vehiculos/nuevo"
          className="flex items-center gap-2 bg-construserv-orange hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Vehículo
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        {[
          { label: "Todos", value: "", key: "status" },
          { label: "Activos", value: "activo", key: "status" },
          { label: "En Mantención", value: "en_mantencion", key: "status" },
          { label: "Fuera de Servicio", value: "fuera_de_servicio", key: "status" },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/dashboard/vehiculos?status=${value}` : "/dashboard/vehiculos"}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              (params.status ?? "") === value
                ? "bg-construserv-orange text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Grid de vehículos */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay vehículos registrados.</p>
          <Link
            href="/dashboard/vehiculos/nuevo"
            className="inline-flex items-center gap-2 mt-4 text-construserv-orange hover:underline text-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar primer vehículo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((vehicle: Vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              currentDriver={activeDrivers?.find((d) => d.vehicle_id === vehicle.id)?.driver_name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
