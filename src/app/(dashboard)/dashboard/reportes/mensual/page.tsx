import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import PrintButton from "@/components/reports/PrintButton";

export const metadata = { title: "Informe Mensual" };

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MAINT_LABELS: Record<string, string> = {
  aceite: "Aceite", frenos: "Frenos", neumaticos: "Neumáticos", filtros: "Filtros",
  suspension: "Suspensión", electrico: "Eléctrico", general: "General", otro: "Otro",
};

function inInterval(date: string, start: string, end: string | null): boolean {
  if (date < start) return false;
  if (end && date > end) return false;
  return true;
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? parseInt(sp.year) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1; // 1-12

  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const first = `${year}-${mm}-01`;
  const last = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  const supabase = await createClient();

  const [
    { data: maints }, { data: docs }, { data: faults }, { data: inspections },
    { data: assignments }, { data: projects },
  ] = await Promise.all([
    supabase.from("maintenances").select("*, vehicle:vehicles(brand, model, plate)").gte("date", first).lte("date", last),
    supabase.from("vehicle_documents").select("*, vehicle:vehicles(brand, model, plate)").gte("issue_date", first).lte("issue_date", last),
    supabase.from("fault_reports").select("*, vehicle:vehicles(brand, model, plate)").gte("created_at", `${first}T00:00:00`).lte("created_at", `${last}T23:59:59`),
    supabase.from("inspections").select("id, has_issues, inspection_date").gte("inspection_date", first).lte("inspection_date", last),
    supabase.from("project_vehicles").select("project_id, vehicle_id, start_date, end_date"),
    supabase.from("projects").select("id, name"),
  ]);

  const maintCost = (maints ?? []).reduce((s, m) => s + (m.total_cost ?? 0), 0);
  const docCost = (docs ?? []).reduce((s, d) => s + (d.amount_paid ?? 0), 0);
  const totalCost = maintCost + docCost;

  // Top vehículos del mes
  const byVehicle: Record<string, { name: string; cost: number }> = {};
  for (const m of maints ?? []) {
    const v = m.vehicle as { brand: string; model: string; plate: string } | null;
    const key = m.vehicle_id;
    if (!byVehicle[key]) byVehicle[key] = { name: v ? `${v.brand} ${v.model} (${v.plate})` : "—", cost: 0 };
    byVehicle[key].cost += m.total_cost ?? 0;
  }
  for (const d of docs ?? []) {
    if (!d.amount_paid) continue;
    const v = d.vehicle as { brand: string; model: string; plate: string } | null;
    const key = d.vehicle_id;
    if (!byVehicle[key]) byVehicle[key] = { name: v ? `${v.brand} ${v.model} (${v.plate})` : "—", cost: 0 };
    byVehicle[key].cost += d.amount_paid;
  }
  const topVehicles = Object.values(byVehicle).sort((a, b) => b.cost - a.cost).slice(0, 8);

  // Costo por obra del mes
  const projName: Record<string, string> = {};
  for (const p of projects ?? []) projName[p.id] = p.name;
  const byProject: Record<string, number> = {};
  for (const a of assignments ?? []) {
    for (const m of maints ?? []) {
      if (m.vehicle_id === a.vehicle_id && inInterval(m.date, a.start_date, a.end_date ?? last)) {
        byProject[a.project_id] = (byProject[a.project_id] ?? 0) + (m.total_cost ?? 0);
      }
    }
    for (const d of docs ?? []) {
      if (d.amount_paid && d.issue_date && d.vehicle_id === a.vehicle_id && inInterval(d.issue_date, a.start_date, a.end_date ?? last)) {
        byProject[a.project_id] = (byProject[a.project_id] ?? 0) + d.amount_paid;
      }
    }
  }
  const projectCosts = Object.entries(byProject).map(([id, cost]) => ({ name: projName[id] ?? "—", cost })).sort((a, b) => b.cost - a.cost);

  const faultsBySeverity = { alta: 0, media: 0, baja: 0 };
  for (const f of faults ?? []) faultsBySeverity[(f.severity as "alta"|"media"|"baja") ?? "media"]++;
  const inspCount = (inspections ?? []).length;
  const inspIssues = (inspections ?? []).filter((i) => i.has_issues).length;

  // Navegación de mes
  const prevM = month === 1 ? 12 : month - 1;
  const prevY = month === 1 ? year - 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  const nextY = month === 12 ? year + 1 : year;
  const isCurrentOrFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);

  const card = "bg-white rounded-xl border border-gray-100 shadow-sm";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Controles (no se imprimen) */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <Link href="/dashboard/reportes" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a Reportes
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/reportes/mensual?year=${prevY}&month=${prevM}`} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"><ChevronLeft className="w-4 h-4" /></Link>
          <span className="text-sm font-bold text-gray-800 min-w-[8rem] text-center">{MONTHS[month - 1]} {year}</span>
          {isCurrentOrFuture ? <span className="p-2 text-gray-300"><ChevronRight className="w-4 h-4" /></span> : <Link href={`/dashboard/reportes/mensual?year=${nextY}&month=${nextM}`} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"><ChevronRight className="w-4 h-4" /></Link>}
          <PrintButton />
        </div>
      </div>

      {/* INFORME (imprimible) */}
      <div className="print-area space-y-6">
        {/* Encabezado */}
        <div className={`${card} p-6 flex items-center justify-between`}>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Informe Mensual de Flota</h1>
            <p className="text-gray-500 mt-1">{MONTHS[month - 1]} {year} — Pares y Alvarez</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-pares-alvarez.png" alt="Pares y Alvarez" className="h-14 w-auto object-contain" />
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Gasto Total", value: formatCurrency(totalCost) },
            { label: "Mantenciones", value: `${(maints ?? []).length}` },
            { label: "Fallas reportadas", value: `${(faults ?? []).length}` },
            { label: "Inspecciones", value: `${inspCount}` },
          ].map((s) => (
            <div key={s.label} className={`${card} p-5`}>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Desglose de gasto */}
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-gray-800 mb-3">Desglose de Gasto</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-lg p-4"><p className="text-xs text-orange-600 font-medium">Mantenciones</p><p className="text-xl font-bold text-orange-700 mt-1">{formatCurrency(maintCost)}</p></div>
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-xs text-blue-600 font-medium">Documentos</p><p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(docCost)}</p></div>
          </div>
        </div>

        {/* Top vehículos */}
        {topVehicles.length > 0 && (
          <div className={card}>
            <div className="p-5 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Gasto por Vehículo</h3></div>
            <div className="divide-y divide-gray-50">
              {topVehicles.map((v, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                  <p className="text-sm text-gray-800">{v.name}</p>
                  <span className="font-semibold text-construserv-orange">{formatCurrency(v.cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Costo por obra */}
        {projectCosts.length > 0 && (
          <div className={card}>
            <div className="p-5 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Gasto por Obra</h3></div>
            <div className="divide-y divide-gray-50">
              {projectCosts.map((p, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                  <p className="text-sm text-gray-800">{p.name}</p>
                  <span className="font-semibold text-construserv-orange">{formatCurrency(p.cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallas e inspecciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${card} p-5`}>
            <h3 className="font-semibold text-gray-800 mb-3">Fallas del Mes</h3>
            <div className="flex gap-3">
              <div className="flex-1 bg-red-50 rounded-lg p-3 text-center"><p className="text-xs text-red-600">Alta</p><p className="text-xl font-bold text-red-700">{faultsBySeverity.alta}</p></div>
              <div className="flex-1 bg-yellow-50 rounded-lg p-3 text-center"><p className="text-xs text-yellow-600">Media</p><p className="text-xl font-bold text-yellow-700">{faultsBySeverity.media}</p></div>
              <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Baja</p><p className="text-xl font-bold text-gray-700">{faultsBySeverity.baja}</p></div>
            </div>
          </div>
          <div className={`${card} p-5`}>
            <h3 className="font-semibold text-gray-800 mb-3">Inspecciones Pre-Uso</h3>
            <div className="flex gap-3">
              <div className="flex-1 bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-green-600">Realizadas</p><p className="text-xl font-bold text-green-700">{inspCount}</p></div>
              <div className="flex-1 bg-yellow-50 rounded-lg p-3 text-center"><p className="text-xs text-yellow-600">Con problemas</p><p className="text-xl font-bold text-yellow-700">{inspIssues}</p></div>
            </div>
          </div>
        </div>

        {/* Detalle de mantenciones */}
        {(maints ?? []).length > 0 && (
          <div className={card}>
            <div className="p-5 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Detalle de Mantenciones</h3></div>
            <div className="divide-y divide-gray-50">
              {(maints ?? []).map((m) => {
                const v = m.vehicle as { brand: string; model: string; plate: string } | null;
                return (
                  <div key={m.id} className="px-5 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{MAINT_LABELS[m.type] ?? m.type} — {v ? `${v.brand} ${v.model} (${v.plate})` : "—"}</p>
                      <p className="text-xs text-gray-400">{m.workshop_name} · {formatDate(m.date)}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(m.total_cost)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pt-2">
          Generado por Flotapp el {formatDate(new Date().toISOString())} · Pares y Alvarez — Sistema de Gestión de Flota
        </p>
      </div>
    </div>
  );
}
