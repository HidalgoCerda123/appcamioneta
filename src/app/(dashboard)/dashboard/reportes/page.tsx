import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import ReportCharts from "@/components/reports/ReportCharts";
import { TrendingUp, DollarSign, Wrench, FileWarning } from "lucide-react";

export default async function ReportsPage() {
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();

  const [
    { data: maintenances },
    { data: documents },
  ] = await Promise.all([
    supabase.from("maintenances").select("*, vehicle:vehicles(plate, brand, model, type)").order("date"),
    supabase.from("vehicle_documents").select("*, vehicle:vehicles(plate, brand, model)").order("issue_date"),
  ]);

  // ── Gastos por mes (mantenciones + documentos) ──────────────────────────
  const monthlySpend = Array.from({ length: 12 }, (_, i) => ({
    mes: new Date(currentYear, i).toLocaleString("es-CL", { month: "short" }),
    mantenciones: 0,
    documentos: 0,
  }));

  maintenances?.forEach((m) => {
    const date = new Date(m.date);
    if (date.getFullYear() === currentYear) {
      monthlySpend[date.getMonth()].mantenciones += m.total_cost;
    }
  });

  documents?.forEach((d) => {
    if (!d.amount_paid) return;
    // Usar issue_date si existe, si no expiry_date como referencia
    const refDate = d.issue_date ? new Date(d.issue_date) : null;
    if (refDate && refDate.getFullYear() === currentYear) {
      monthlySpend[refDate.getMonth()].documentos += d.amount_paid;
    }
  });

  // ── Gastos por categoría ─────────────────────────────────────────────────
  const spendByType: Record<string, number> = {};

  maintenances?.forEach((m) => {
    const typeLabels: Record<string, string> = {
      aceite: "Aceite", frenos: "Frenos", neumaticos: "Neumáticos",
      filtros: "Filtros", suspension: "Suspensión", electrico: "Eléctrico",
      general: "General", otro: "Otro",
    };
    const label = typeLabels[m.type] ?? m.type;
    spendByType[label] = (spendByType[label] ?? 0) + m.total_cost;
  });

  const docTypeLabels: Record<string, string> = {
    revision_tecnica: "Rev. Técnica", soap: "SOAP",
    permiso_circulacion: "Permiso Circ.", seguro: "Seguro",
    licencia_operador: "Lic. Operador", otro: "Doc. Otro",
  };
  documents?.forEach((d) => {
    if (!d.amount_paid) return;
    const label = docTypeLabels[d.type] ?? d.type;
    spendByType[label] = (spendByType[label] ?? 0) + d.amount_paid;
  });

  const spendByTypeData = Object.entries(spendByType)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  // ── Top vehículos (mantenciones + documentos) ────────────────────────────
  const spendByVehicle: Record<string, { name: string; mantenciones: number; documentos: number }> = {};

  maintenances?.forEach((m) => {
    const v = m.vehicle as { plate: string; brand: string; model: string };
    if (!v) return;
    if (!spendByVehicle[m.vehicle_id]) {
      spendByVehicle[m.vehicle_id] = { name: `${v.brand} ${v.model} (${v.plate})`, mantenciones: 0, documentos: 0 };
    }
    spendByVehicle[m.vehicle_id].mantenciones += m.total_cost;
  });

  documents?.forEach((d) => {
    if (!d.amount_paid) return;
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

  // ── Totales generales ────────────────────────────────────────────────────
  const maintenanceYearSpend = maintenances
    ?.filter((m) => new Date(m.date).getFullYear() === currentYear)
    .reduce((sum, m) => sum + m.total_cost, 0) ?? 0;

  const docYearSpend = documents
    ?.filter((d) => {
      const refDate = d.issue_date ? new Date(d.issue_date) : null;
      return refDate && refDate.getFullYear() === currentYear && d.amount_paid;
    })
    .reduce((sum, d) => sum + (d.amount_paid ?? 0), 0) ?? 0;

  const totalYearSpend = maintenanceYearSpend + docYearSpend;

  const totalAllTimeSpend =
    (maintenances?.reduce((sum, m) => sum + m.total_cost, 0) ?? 0) +
    (documents?.reduce((sum, d) => sum + (d.amount_paid ?? 0), 0) ?? 0);

  const expiredDocs = documents?.filter((d) => new Date(d.expiry_date) < new Date()).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
        <p className="text-gray-500 text-sm mt-1">Incluye mantenciones y gastos en documentos</p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Gasto Total ${currentYear}`, value: formatCurrency(totalYearSpend), icon: TrendingUp, color: "bg-blue-500" },
          { label: "Gasto Total Historial", value: formatCurrency(totalAllTimeSpend), icon: DollarSign, color: "bg-construserv-orange" },
          { label: `Mantenciones ${currentYear}`, value: formatCurrency(maintenanceYearSpend), icon: Wrench, color: "bg-green-500" },
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

      {/* Desglose año actual */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Desglose {currentYear}</h3>
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
          <h3 className="font-semibold text-gray-800">Top Vehículos por Gasto Total</h3>
          <p className="text-xs text-gray-400 mt-0.5">Incluye mantenciones + documentos</p>
        </div>
        <div className="divide-y divide-gray-50">
          {topVehicles.length === 0 ? (
            <p className="p-5 text-gray-400 text-sm text-center">Sin datos aún</p>
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
    </div>
  );
}
