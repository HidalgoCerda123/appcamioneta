import { createClient } from "@/lib/supabase/server";
import { Plus, FileText, AlertTriangle, Search, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { formatDate, getDaysUntil, getAlertColor } from "@/lib/utils";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 20;

type SortField = "expiry_date" | "type" | "label";
type SortDir = "asc" | "desc";

export const metadata = { title: 'Documentos' };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; estado?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const { q, tipo, estado, page: pageParam, sort, dir } = await searchParams;
  const supabase = await createClient();

  const sortField: SortField = (["expiry_date", "type", "label"].includes(sort ?? "") ? sort : "expiry_date") as SortField;
  const sortDir: SortDir = dir === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

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
    .from("vehicle_documents")
    .select("*, vehicle:vehicles(plate, brand, model)", { count: "exact" })
    .order(sortField, { ascending: sortDir === "asc" });

  if (tipo) query = query.eq("type", tipo);

  if (estado === "vencido") query = query.lt("expiry_date", today);
  else if (estado === "proximo") query = query.gte("expiry_date", today).lte("expiry_date", in30);
  else if (estado === "vigente") query = query.gt("expiry_date", in30);

  if (q) {
    if (vehicleIdsFromSearch.length > 0) {
      query = query.or(`label.ilike.%${q}%,vehicle_id.in.(${vehicleIdsFromSearch.join(",")})`);
    } else {
      query = query.ilike("label", `%${q}%`);
    }
  }

  const { count: total } = await query;
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const { data: documents } = await query.range(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE - 1
  );

  const typeLabels: Record<string, string> = {
    revision_tecnica: "Revisión Técnica",
    soap: "SOAP",
    permiso_circulacion: "Permiso de Circulación",
    seguro: "Seguro",
    licencia_operador: "Licencia Operador",
    otro: "Otro",
  };

  function buildSortHref(field: SortField) {
    const newDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tipo) params.set("tipo", tipo);
    if (estado) params.set("estado", estado);
    params.set("sort", field);
    params.set("dir", newDir);
    return `/dashboard/documentos?${params.toString()}`;
  }

  function buildPageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tipo) params.set("tipo", tipo);
    if (estado) params.set("estado", estado);
    if (sortField !== "expiry_date") params.set("sort", sortField);
    if (sortDir !== "asc") params.set("dir", sortDir);
    params.set("page", String(p));
    return `/dashboard/documentos?${params.toString()}`;
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-construserv-orange inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-construserv-orange inline ml-1" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documentos</h2>
          <p className="text-gray-500 text-sm mt-1">{total ?? 0} documentos registrados</p>
        </div>
        <Link
          href="/dashboard/documentos/nuevo"
          className="flex items-center gap-2 bg-construserv-orange hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Documento
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
            placeholder="Buscar vehículo o documento..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
          />
        </div>
        <select name="tipo" defaultValue={tipo ?? ""} className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-construserv-orange">
          <option value="">Todos los tipos</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="estado" defaultValue={estado ?? ""} className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-construserv-orange">
          <option value="">Todos los estados</option>
          <option value="vencido">Vencido</option>
          <option value="proximo">Próximo a vencer (30 días)</option>
          <option value="vigente">Vigente</option>
        </select>
        <button type="submit" className="bg-construserv-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition">Filtrar</button>
        {(q || tipo || estado) && (
          <Link href="/dashboard/documentos" className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Limpiar</Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {!documents || documents.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay documentos registrados.</p>
          </div>
        ) : (
          <>
            {/* Vista mobile: cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {documents.map((doc) => {
                const days = getDaysUntil(doc.expiry_date);
                const color = getAlertColor(days);
                const vehicle = doc.vehicle as { brand: string; model: string; plate: string };
                return (
                  <Link key={doc.id} href={`/dashboard/documentos/${doc.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{vehicle?.brand} {vehicle?.model} <span className="text-gray-400 font-normal">{vehicle?.plate}</span></p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-gray-700">{doc.label}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">{typeLabels[doc.type]}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Vence {formatDate(doc.expiry_date)}</p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {days < 0 ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Vencido
                        </span>
                      ) : (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          color === "red" ? "bg-red-100 text-red-700" :
                          color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {days === 0 ? "Hoy" : `${days}d`}
                        </span>
                      )}
                    </div>
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
                    <Link href={buildSortHref("label")} className="hover:text-gray-800 transition inline-flex items-center">
                      Documento<SortIcon field="label" />
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">
                    <Link href={buildSortHref("type")} className="hover:text-gray-800 transition inline-flex items-center">
                      Tipo<SortIcon field="type" />
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">
                    <Link href={buildSortHref("expiry_date")} className="hover:text-gray-800 transition inline-flex items-center">
                      Vencimiento<SortIcon field="expiry_date" />
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map((doc) => {
                  const days = getDaysUntil(doc.expiry_date);
                  const color = getAlertColor(days);
                  const vehicle = doc.vehicle as { brand: string; model: string; plate: string };
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/documentos/${doc.id}`} className="block">
                          <span className="font-medium text-gray-800">{vehicle?.brand} {vehicle?.model}</span>
                          <br />
                          <span className="text-gray-400 text-xs">{vehicle?.plate}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/documentos/${doc.id}`} className="block font-medium text-gray-700">{doc.label}</Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {typeLabels[doc.type]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{formatDate(doc.expiry_date)}</td>
                      <td className="px-5 py-3">
                        {days < 0 ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-red-700">
                            <AlertTriangle className="w-3 h-3" /> Vencido
                          </span>
                        ) : (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            color === "red" ? "bg-red-100 text-red-700" :
                            color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                            {days === 0 ? "Vence hoy" : `${days} días`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={safePage} totalPages={totalPages} buildHref={buildPageHref} />
          </>
        )}
      </div>
    </div>
  );
}
