import { createClient } from "@/lib/supabase/server";
import { Plus, Wrench, Search, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 20;

type SortField = "date" | "total_cost" | "km_at_service" | "type";
type SortDir = "asc" | "desc";

export const metadata = { title: 'Mantenciones' };

export default async function MaintenancesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; vehiculo?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const { q, tipo, vehiculo, page: pageParam, sort, dir } = await searchParams;
  const supabase = await createClient();

  const sortField: SortField = (["date", "total_cost", "km_at_service", "type"].includes(sort ?? "") ? sort : "date") as SortField;
  const sortDir: SortDir = dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, plate, brand, model")
    .order("brand");

  // Buscar vehículos que coincidan con el texto de búsqueda
  let vehicleIdsFromSearch: string[] = [];
  if (q) {
    const { data: matchingVehicles } = await supabase
      .from("vehicles")
      .select("id")
      .or(`brand.ilike.%${q}%,model.ilike.%${q}%,plate.ilike.%${q}%`);
    vehicleIdsFromSearch = (matchingVehicles ?? []).map((v) => v.id);
  }

  // Construir query con filtros server-side
  let query = supabase
    .from("maintenances")
    .select("*, vehicle:vehicles(id, plate, brand, model, type)", { count: "exact" })
    .order(sortField, { ascending: sortDir === "asc" });

  if (tipo) query = query.eq("type", tipo);
  if (vehiculo) query = query.eq("vehicle_id", vehiculo);
  if (q) {
    if (vehicleIdsFromSearch.length > 0) {
      query = query.or(`workshop_name.ilike.%${q}%,vehicle_id.in.(${vehicleIdsFromSearch.join(",")})`);
    } else {
      query = query.ilike("workshop_name", `%${q}%`);
    }
  }

  // Obtener total primero para calcular páginas
  const { count: total } = await query;
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  // Obtener solo la página actual
  const { data: maintenances } = await query.range(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE - 1
  );

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

  function buildSortHref(field: SortField) {
    const newDir = sortField === field && sortDir === "desc" ? "asc" : "desc";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tipo) params.set("tipo", tipo);
    if (vehiculo) params.set("vehiculo", vehiculo);
    params.set("sort", field);
    params.set("dir", newDir);
    return `/dashboard/mantenciones?${params.toString()}`;
  }

  function buildPageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tipo) params.set("tipo", tipo);
    if (vehiculo) params.set("vehiculo", vehiculo);
    if (sortField !== "date") params.set("sort", sortField);
    if (sortDir !== "desc") params.set("dir", sortDir);
    params.set("page", String(p));
    return `/dashboard/mantenciones?${params.toString()}`;
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3 text-construserv-orange inline ml-1" />
      : <ChevronUp className="w-3 h-3 text-construserv-orange inline ml-1" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mantenciones</h2>
          <p className="text-gray-500 text-sm mt-1">{total ?? 0} registros</p>
        </div>
        <Link
          href="/dashboard/mantenciones/nueva"
          className="flex items-center gap-2 bg-construserv-orange hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Nueva Mantención
        </Link>
      </div>

      {/* Filtros */}
      <form method="GET" className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        {sort && <input type="hidden" name="sort" value={sort} />}
        {dir && <input type="hidden" name="dir" value={dir} />}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar vehículo o taller..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
          />
        </div>
        <select
          name="tipo"
          defaultValue={tipo ?? ""}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-construserv-orange"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          name="vehiculo"
          defaultValue={vehiculo ?? ""}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-construserv-orange"
        >
          <option value="">Todos los vehículos</option>
          {(vehicles ?? []).map((v) => (
            <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>
          ))}
        </select>
        <button type="submit" className="bg-construserv-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition">
          Filtrar
        </button>
        {(q || tipo || vehiculo) && (
          <Link href="/dashboard/mantenciones" className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
            Limpiar
          </Link>
        )}
      </form>

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
          <>
            {/* Vista mobile: cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {maintenances.map((m) => {
                const v = m.vehicle as { brand: string; model: string; plate: string };
                return (
                  <Link key={m.id} href={`/dashboard/mantenciones/${m.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${typeColors[m.type] ?? "bg-gray-100 text-gray-700"}`}>
                          {typeLabels[m.type] ?? m.type}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(m.date)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{v?.brand} {v?.model} <span className="text-gray-400 font-normal">{v?.plate}</span></p>
                      <p className="text-xs text-gray-400">{m.workshop_name} · {formatKm(m.km_at_service)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 ml-3 flex-shrink-0">{formatCurrency(m.total_cost)}</p>
                  </Link>
                );
              })}
            </div>
            {/* Vista desktop: tabla */}
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Vehículo</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">
                    <Link href={buildSortHref("type")} className="hover:text-gray-800 transition inline-flex items-center">
                      Tipo<SortIcon field="type" />
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Taller</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">
                    <Link href={buildSortHref("km_at_service")} className="hover:text-gray-800 transition inline-flex items-center">
                      Kilometraje<SortIcon field="km_at_service" />
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">
                    <Link href={buildSortHref("date")} className="hover:text-gray-800 transition inline-flex items-center">
                      Fecha<SortIcon field="date" />
                    </Link>
                  </th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">
                    <Link href={buildSortHref("total_cost")} className="hover:text-gray-800 transition inline-flex items-center justify-end w-full">
                      Costo<SortIcon field="total_cost" />
                    </Link>
                  </th>
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
                    <td className="px-5 py-3 text-right font-semibold text-gray-800">{formatCurrency(m.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={safePage} totalPages={totalPages} buildHref={buildPageHref} />
          </>
        )}
      </div>
    </div>
  );
}
