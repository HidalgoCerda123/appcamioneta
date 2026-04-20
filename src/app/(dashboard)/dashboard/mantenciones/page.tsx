import { createClient } from "@/lib/supabase/server";
import { Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";

export default async function MaintenancesPage() {
  const supabase = await createClient();

  const { data: maintenances } = await supabase
    .from("maintenances")
    .select("*, vehicle:vehicles(plate, brand, model, type)")
    .order("date", { ascending: false });

  const typeLabels: Record<string, string> = {
    aceite: "Aceite",
    frenos: "Frenos",
    neumaticos: "Neumáticos",
    filtros: "Filtros",
    suspension: "Suspensión",
    electrico: "Eléctrico",
    general: "General",
    otro: "Otro",
  };

  const typeColors: Record<string, string> = {
    aceite: "bg-amber-100 text-amber-700",
    frenos: "bg-red-100 text-red-700",
    neumaticos: "bg-gray-100 text-gray-700",
    filtros: "bg-blue-100 text-blue-700",
    suspension: "bg-purple-100 text-purple-700",
    electrico: "bg-yellow-100 text-yellow-700",
    general: "bg-green-100 text-green-700",
    otro: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mantenciones</h2>
          <p className="text-gray-500 text-sm mt-1">{maintenances?.length ?? 0} registros</p>
        </div>
        <Link
          href="/dashboard/mantenciones/nueva"
          className="flex items-center gap-2 bg-construserv-orange hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Nueva Mantención
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {!maintenances || maintenances.length === 0 ? (
          <div className="text-center py-16">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay mantenciones registradas.</p>
            <Link href="/dashboard/mantenciones/nueva" className="inline-flex items-center gap-2 mt-4 text-construserv-orange hover:underline text-sm">
              <Plus className="w-4 h-4" />
              Registrar primera mantención
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Vehículo</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Taller</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Kilometraje</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Fecha</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {maintenances.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition cursor-pointer">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/mantenciones/${m.id}`} className="block">
                      <span className="font-medium text-gray-800">
                        {(m.vehicle as { brand: string; model: string; plate: string })?.brand}{" "}
                        {(m.vehicle as { brand: string; model: string; plate: string })?.model}
                      </span>
                      <br />
                      <span className="text-gray-400 text-xs">{(m.vehicle as { brand: string; model: string; plate: string })?.plate}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeColors[m.type] ?? "bg-gray-100 text-gray-700"}`}>
                      {typeLabels[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{m.workshop_name}</td>
                  <td className="px-5 py-3 text-gray-700">{formatKm(m.km_at_service)}</td>
                  <td className="px-5 py-3 text-gray-700">{formatDate(m.date)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">
                    {formatCurrency(m.total_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
