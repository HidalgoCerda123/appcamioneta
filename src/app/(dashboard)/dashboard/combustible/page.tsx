import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Fuel, Plus, TrendingUp, DollarSign, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { computeFuelStats, type FuelLoadPoint } from "@/lib/fuel";

export const metadata = { title: "Combustible" };

export default async function FuelPage() {
  const supabase = await createClient();

  // Se calcula todo desde las cargas (misma fuente y método que ficha, reportes y gráficos)
  const [{ data: allLoads }, { data: { user } }] = await Promise.all([
    supabase.from("fuel_loads").select("id, vehicle_id, fuel_date, liters, total_cost, km_at_load, station, vehicle:vehicles(id, brand, model, plate, usage_unit)").order("fuel_date", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  let canEdit = false;
  if (user) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    canEdit = prof?.role === "admin" || prof?.role === "editor";
  }

  const loads = allLoads ?? [];

  const totalSpend = loads.reduce((s, l) => s + (l.total_cost ?? 0), 0);
  const totalLiters = loads.reduce((s, l) => s + Number(l.liters ?? 0), 0);

  // Agrupar cargas por vehículo y calcular estadísticas con el método canónico
  const byVehicle: Record<string, { name: string; unit: "km" | "horas"; points: FuelLoadPoint[] }> = {};
  for (const l of loads) {
    const v = l.vehicle as unknown as { id: string; brand: string; model: string; plate: string; usage_unit: string } | null;
    if (!v) continue;
    if (!byVehicle[v.id]) byVehicle[v.id] = { name: `${v.brand} ${v.model} (${v.plate})`, unit: (v.usage_unit as "km" | "horas") ?? "km", points: [] };
    byVehicle[v.id].points.push({ fuel_date: l.fuel_date, liters: Number(l.liters), total_cost: l.total_cost ?? 0, km_at_load: l.km_at_load });
  }

  const ranking = Object.values(byVehicle)
    .map((g) => ({ name: g.name, unit: g.unit, stats: computeFuelStats(g.points, g.unit) }))
    .filter((x) => x.stats && x.stats.costPerUnit !== null)
    .sort((a, b) => (b.stats!.costPerUnit ?? 0) - (a.stats!.costPerUnit ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Combustible</h2>
          <p className="text-gray-500 text-sm mt-1">Gasto y rendimiento por vehículo</p>
        </div>
        <Link href="/dashboard/combustible/nueva" className="flex items-center gap-2 bg-construserv-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
          <Plus className="w-4 h-4" /> Registrar carga
        </Link>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Gasto total combustible</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalSpend)}</p>
          </div>
          <div className="bg-construserv-orange p-2.5 rounded-xl"><DollarSign className="w-5 h-5 text-white" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Litros totales</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalLiters.toLocaleString("es-CL")} L</p>
          </div>
          <div className="bg-blue-500 p-2.5 rounded-xl"><Fuel className="w-5 h-5 text-white" /></div>
        </div>
      </div>

      {/* Ranking gasto por km */}
      {ranking.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-construserv-orange" /> Gasto de Combustible por km / hora</h3>
            <p className="text-xs text-gray-400 mt-0.5">Costo de combustible dividido por el recorrido. Los más caros primero.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {ranking.map((r, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-400">
                    {r.stats!.efficiency !== null ? `${r.stats!.efficiency} ${r.stats!.efficiencyLabel}` : "—"} · {r.stats!.totalLiters.toLocaleString("es-CL")} L · {formatCurrency(r.stats!.totalCost)}
                  </p>
                </div>
                <span className="font-bold text-construserv-orange">{formatCurrency(r.stats!.costPerUnit ?? 0)}/{r.unit === "horas" ? "h" : "km"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cargas recientes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Cargas Recientes</h3></div>
        <div className="divide-y divide-gray-50">
          {loads.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">Sin cargas registradas. Usa &quot;Registrar carga&quot; para empezar.</p>
          ) : (
            loads.slice(0, 50).map((l) => {
              const v = l.vehicle as unknown as { id: string; brand: string; model: string; plate: string; usage_unit: string } | null;
              const us = v?.usage_unit === "horas" ? "h" : "km";
              const inner = (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {v ? `${v.brand} ${v.model} (${v.plate})` : "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(l.fuel_date)} · {Number(l.liters).toLocaleString("es-CL")} L
                      {l.km_at_load ? ` · ${l.km_at_load.toLocaleString("es-CL")} ${us}` : ""}
                      {l.station ? ` · ${l.station}` : ""}
                    </p>
                  </div>
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    {formatCurrency(l.total_cost)}
                    {canEdit && <Pencil className="w-3.5 h-3.5 text-gray-300" />}
                  </span>
                </>
              );
              return canEdit ? (
                <Link key={l.id} href={`/dashboard/combustible/${l.id}/editar`} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                  {inner}
                </Link>
              ) : (
                <div key={l.id} className="px-5 py-3 flex items-center justify-between">
                  {inner}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
