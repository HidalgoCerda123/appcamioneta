import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import ReportCharts from "@/components/reports/ReportCharts";
import ReportExport from "@/components/reports/ReportExport";
import { TrendingUp, DollarSign, Wrench, FileWarning, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

export const metadata = { title: 'Reportes' };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();
  const selectedYear = yearParam ? parseInt(yearParam) : currentYear;
  const prevYear = selectedYear - 1;
  const nextYear = selectedYear + 1;

  const [{ data: maintenances }, { data: documents }, { data: allVehicles }, { data: spans }] = await Promise.all([
    supabase.from("maintenances").select("*, vehicle:vehicles(plate, brand, model, type)").order("date"),
    supabase.from("vehicle_documents").select("*, vehicle:vehicles(plate, brand, model)").order("issue_date"),
    supabase.from("vehicles").select("id, brand, model, plate, current_km, usage_unit"),
    supabase.from("odometer_span").select("vehicle_id, min_km, max_km"),
  ]);

  // ── Gastos por mes ──────────────────────────────────────────────────────────
  const monthlySpend = Array.from({ length: 12 }, (_, i) => ({
    mes: new Date(selectedYear, i).toLocaleString("es-CL", { month: "short" }),
    mantenciones: 0,
    documentos: 0,
  }));

  maintenances?.forEach((m) => {
    const date = new Date(m.date);
    if (date.getFullYear() === selectedYear) {
      monthlySpend[date.getMonth()].mantenciones += m.total_cost;
    }
  });

  documents?.forEach((d) => {
    if (!d.amount_paid) return;
    const refDate = d.issue_date ? new Date(d.issue_date) : null;
    if (refDate && refDate.getFullYear() === selectedYear) {
      monthlySpend[refDate.getMonth()].documentos += d.amount_paid;
    }
  });

  // ── Gastos por categoría ────────────────────────────────────────────────────
  const spendByType: Record<string, number> = {};
  const typeLabels: Record<string, string> = {
    aceite: "Aceite", frenos: "Frenos", neumaticos: "Neumáticos",
    filtros: "Filtros", suspension: "Suspensión", electrico: "Eléctrico",
    general: "General", otro: "Otro",
  };
  const docTypeLabels: Record<string, string> = {
    revision_tecnica: "Rev. Técnica", soap: "SOAP",
    permiso_circulacion: "Permiso Circ.", seguro: "Seguro",
    licencia_operador: "Lic. Operador", otro: "Doc. Otro",
  };

  maintenances?.forEach((m) => {
    if (new Date(m.date).getFullYear() !== selectedYear) return;
    const label = typeLabels[m.type] ?? m.type;
    spendByType[label] = (spendByType[label] ?? 0) + m.total_cost;
  });

  documents?.forEach((d) => {
    if (!d.amount_paid) return;
    const refDate = d.issue_date ? new Date(d.issue_date) : null;
    if (!refDate || refDate.getFullYear() !== selectedYear) return;
    const label = docTypeLabels[d.type] ?? d.type;
    spendByType[label] = (spendByType[label] ?? 0) + d.amount_paid;
  });

  const spendByTypeData = Object.entries(spendByType)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  // ── Top vehículos ────────────────────────────────────────────────────────────
  const spendByVehicle: Record<string, { name: string; mantenciones: number; documentos: number }> = {};

  maintenances?.forEach((m) => {
    if (new Date(m.date).getFullYear() !== selectedYear) return;
    const v = m.vehicle as { plate: string; brand: string; model: string };
    if (!v) return;
    if (!spendByVehicle[m.vehicle_id]) {
      spendByVehicle[m.vehicle_id] = { name: `${v.brand} ${v.model} (${v.plate})`, mantenciones: 0, documentos: 0 };
    }
    spendByVehicle[m.vehicle_id].mantenciones += m.total_cost;
  });

  documents?.forEach((d) => {
    if (!d.amount_paid) return;
    const refDate = d.issue_date ? new Date(d.issue_date) : null;
    if (!refDate || refDate.getFullYear() !== selectedYear) return;
    const v = d.vehicle as { plate: string; brand: string; model: string };
    if (!v) return;
    if (!spendByVehicle[d.vehicle_id]) {
      spendByVehicle[d.vehicle_id] = { name: `${v.brand} ${v.model} (${v.plate})`, mantenciones: 0, documentos: 0 };
    }
    spendByVehicle[d.vehicle_id].documentos += d.amount_paid;
  });

  const topVehicles = Object.values(spendByVehicle)
    .map((v) => ({ ...v, total: v.mantenciones + v.documentos }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ── Totales ───────────────────────────────────────────────────────────────────
  const maintenanceYearSpend = maintenances
    ?.filter((m) => new Date(m.date).getFullYear() === selectedYear)
    .reduce((sum, m) => sum + m.total_cost, 0) ?? 0;

  const docYearSpend = documents
    ?.filter((d) => {
      const refDate = d.issue_date ? new Date(d.issue_date) : null;
      return refDate && refDate.getFullYear() === selectedYear && d.amount_paid;
    })
    .reduce((sum, d) => sum + (d.amount_paid ?? 0), 0) ?? 0;

  const totalYearSpend = maintenanceYearSpend + docYearSpend;
  const totalAllTimeSpend =
    (maintenances?.reduce((sum, m) => sum + m.total_cost, 0) ?? 0) +
    (documents?.reduce((sum, d) => sum + (d.amount_paid ?? 0), 0) ?? 0);

  const expiredDocs = documents?.filter((d) => new Date(d.expiry_date) < new Date()).length ?? 0;

  // ── Costo por km/hora (histórico) ──────────────────────────────────────────────
  const spendAllByVehicle: Record<string, number> = {};
  maintenances?.forEach((m) => { spendAllByVehicle[m.vehicle_id] = (spendAllByVehicle[m.vehicle_id] ?? 0) + m.total_cost; });
  documents?.forEach((d) => { if (d.amount_paid) spendAllByVehicle[d.vehicle_id] = (spendAllByVehicle[d.vehicle_id] ?? 0) + d.amount_paid; });

  const usageRange: Record<string, { min: number; max: number }> = {};
  (spans ?? []).forEach((r) => {
    usageRange[r.vehicle_id] = { min: r.min_km ?? 0, max: r.max_km ?? 0 };
  });

  const costPerUsage = (allVehicles ?? [])
    .map((v) => {
      const range = usageRange[v.id];
      const span = range ? range.max - range.min : 0;
      const spend = spendAllByVehicle[v.id] ?? 0;
      const unitShort = v.usage_unit === "horas" ? "h" : "km";
      return {
        name: `${v.brand} ${v.model} (${v.plate})`,
        unitShort,
        spend,
        span,
        cost: span > 0 ? Math.round(spend / span) : null,
      };
    })
    .filter((v) => v.cost !== null)
    .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
    .slice(0, 8);

  // Datos para exportar CSV
  const exportMaintenances = (maintenances ?? [])
    .filter((m) => new Date(m.date).getFullYear() === selectedYear)
    .map((m) => {
      const v = m.vehicle as { plate: string; brand: string; model: string } | null;
      return {
        tipo: typeLabels[m.type] ?? m.type,
        vehiculo: v ? `${v.brand} ${v.model}` : "",
        patente: v?.plate ?? "",
        taller: m.workshop_name ?? "",
        fecha: m.date,
        km: m.km_at_service,
        costo: m.total_cost,
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
          <p className="text-gray-500 text-sm mt-1">Incluye mantenciones y gastos en documentos</p>
        </div>
        {/* Selector de año */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/reportes?year=${prevYear}`}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="text-lg font-bold text-gray-800 min-w-[4rem] text-center">{selectedYear}</span>
          {selectedYear < currentYear && (
            <Link
              href={`/dashboard/reportes?year=${nextYear}`}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          {selectedYear === currentYear && (
            <span className="p-2 text-gray-300"><ChevronRight className="w-4 h-4" /></span>
          )}
          <ReportExport maintenances={exportMaintenances} year={selectedYear} />
          <Link href="/dashboard/reportes/mensual" className="flex items-center gap-2 bg-construserv-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
            <FileText className="w-4 h-4" />
            Informe mensual PDF
          </Link>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Gasto Total ${selectedYear}`, value: formatCurrency(totalYearSpend), icon: TrendingUp, color: "bg-blue-500" },
          { label: "Gasto Total Historial", value: formatCurrency(totalAllTimeSpend), icon: DollarSign, color: "bg-construserv-orange" },
          { label: `Mantenciones ${selectedYear}`, value: formatCurrency(maintenanceYearSpend), icon: Wrench, color: "bg-green-500" },
          { label: "Docs. Vencidos", value: expiredDocs, icon: FileWarning, color: expiredDocs > 0 ? "bg-red-500" : "bg-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${color} p-2.5 rounded-xl`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desglose año seleccionado */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Desglose {selectedYear}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-xs text-orange-600 font-medium">Mantenciones</p>
            <p className="text-xl font-bold text-orange-700 mt-1">{formatCurrency(maintenanceYearSpend)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600 font-medium">Documentos (RT, SOAP, Permisos, etc.)</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(docYearSpend)}</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <ReportCharts monthlySpend={monthlySpend} spendByType={spendByTypeData} />

      {/* Top vehículos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Top Vehículos por Gasto — {selectedYear}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Incluye mantenciones + documentos</p>
        </div>
        <div className="divide-y divide-gray-50">
          {topVehicles.length === 0 ? (
            <p className="p-5 text-gray-400 text-sm text-center">Sin datos para {selectedYear}</p>
          ) : (
            topVehicles.map((v, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{v.name}</p>
                    <p className="text-xs text-gray-400">
                      Mant: {formatCurrency(v.mantenciones)} · Docs: {formatCurrency(v.documentos)}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-construserv-orange">{formatCurrency(v.total)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Costo por km/hora */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Costo por km / hora (histórico)</h3>
          <p className="text-xs text-gray-400 mt-0.5">Gasto total dividido por el uso registrado. Los más caros primero — candidatos a revisar o reemplazar.</p>
        </div>
        <div className="divide-y divide-gray-50">
          {costPerUsage.length === 0 ? (
            <p className="p-5 text-gray-400 text-sm text-center">
              Aún no hay suficientes lecturas de km/horas para calcular el costo por unidad.
            </p>
          ) : (
            costPerUsage.map((v, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{v.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatCurrency(v.spend)} en {v.span.toLocaleString("es-CL")} {v.unitShort}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-construserv-orange">
                  {formatCurrency(v.cost ?? 0)}/{v.unitShort}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
