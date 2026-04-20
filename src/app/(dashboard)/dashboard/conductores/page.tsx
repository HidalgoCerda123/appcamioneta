import { createClient } from "@/lib/supabase/server";
import { HardHat, Search } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function ConductoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  // Traer todos los conductores (registros únicos por nombre+rut, el más reciente)
  let query = supabase
    .from("vehicle_drivers")
    .select("*, vehicle:vehicles(id, plate, brand, model)")
    .order("start_date", { ascending: false });

  const { data: drivers } = await query;

  // Agrupar por driver_name+driver_rut para mostrar una fila por conductor
  const seen = new Map<string, typeof drivers extends (infer T)[] | null ? T : never>();
  for (const d of drivers ?? []) {
    const key = `${d.driver_name}__${d.driver_rut ?? ""}`;
    if (!seen.has(key)) seen.set(key, d);
  }
  let unique = Array.from(seen.values());

  if (q) {
    const lq = q.toLowerCase();
    unique = unique.filter(
      (d) =>
        d.driver_name.toLowerCase().includes(lq) ||
        (d.driver_rut ?? "").toLowerCase().includes(lq) ||
        (d.driver_phone ?? "").toLowerCase().includes(lq)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Conductores</h2>
          <p className="text-gray-500 text-sm mt-1">{unique.length} conductor(es) registrados</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <form method="GET" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre, RUT o teléfono..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
          />
        </form>
      </div>

      {unique.length === 0 ? (
        <div className="text-center py-16">
          <HardHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No se encontraron conductores.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {unique.map((d) => {
            const isActive = !d.end_date;
            const veh = d.vehicle as { id: string; plate: string; brand: string; model: string } | null;
            return (
              <Link
                key={d.id}
                href={`/dashboard/conductores/${d.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-construserv-orange flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {d.driver_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-construserv-orange transition">
                      {d.driver_name}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-0.5">
                      {d.driver_rut && (
                        <span className="text-xs text-gray-500">RUT: {d.driver_rut}</span>
                      )}
                      {d.driver_phone && (
                        <span className="text-xs text-gray-500">{d.driver_phone}</span>
                      )}
                      {d.license_type && (
                        <span className="text-xs text-gray-500">Lic. {d.license_type}</span>
                      )}
                      {d.license_expiry && (
                        <span className="text-xs text-gray-500">
                          Vence: {formatDate(d.license_expiry)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  {isActive && veh ? (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                      {veh.brand} {veh.model} — {veh.plate}
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Sin vehículo activo
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Desde {formatDate(d.start_date)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
