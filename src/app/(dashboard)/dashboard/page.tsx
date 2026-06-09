import { createClient } from "@/lib/supabase/server";
import { Truck, Wrench, FileWarning, AlertTriangle, CheckCircle, UserCheck, XCircle, Gauge, CalendarClock } from "lucide-react";
import { formatCurrency, formatDate, getDaysUntil, getAlertColor } from "@/lib/utils";
import { daysSince } from "@/lib/date";
import { computePlanStatus, type MaintenancePlan as MaintenancePlanType } from "@/lib/maintenance";
import Link from "next/link";
import type { VehicleDocument } from "@/types";

const MAINT_TYPE_LABELS: Record<string, string> = {
  aceite: "Aceite", frenos: "Frenos", neumaticos: "Neumáticos", filtros: "Filtros",
  suspension: "Suspensión", electrico: "Eléctrico", general: "General", otro: "Otro",
};

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    totalVehiclesResult,
    activeVehiclesResult,
    inMaintenanceResult,
    recentMaintenancesResult,
    expiringDocsResult,
    expiredDocsResult,
    expiringLicensesResult,
    nextServicesResult,
  ] = await Promise.allSettled([
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "activo"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "en_mantencion"),
    supabase.from("maintenances").select("*, vehicle:vehicles(plate, brand, model)").order("date", { ascending: false }).limit(5),
    supabase.from("vehicle_documents").select("*, vehicle:vehicles(plate, brand, model)").gt("expiry_date", today).lte("expiry_date", in30).order("expiry_date", { ascending: true }).limit(8),
    supabase.from("vehicle_documents").select("*, vehicle:vehicles(plate, brand, model)").lte("expiry_date", today).order("expiry_date", { ascending: false }).limit(5),
    supabase.from("vehicle_drivers").select("*, vehicle:vehicles(plate, brand, model)").is("end_date", null).not("license_expiry", "is", null).lte("license_expiry", in30).order("license_expiry", { ascending: true }),
    supabase.from("maintenances").select("vehicle_id, next_service_date, next_service_km, vehicle:vehicles(plate, brand, model)").not("next_service_date", "is", null).lte("next_service_date", in30).order("next_service_date", { ascending: true }).limit(5),
  ]);

  const totalVehicles = totalVehiclesResult.status === "fulfilled" ? totalVehiclesResult.value.count : 0;
  const activeVehicles = activeVehiclesResult.status === "fulfilled" ? activeVehiclesResult.value.count : 0;
  const inMaintenance = inMaintenanceResult.status === "fulfilled" ? inMaintenanceResult.value.count : 0;
  const recentMaintenances = recentMaintenancesResult.status === "fulfilled" ? recentMaintenancesResult.value.data : [];
  const expiringDocs = expiringDocsResult.status === "fulfilled" ? expiringDocsResult.value.data : [];
  const expiredDocs = expiredDocsResult.status === "fulfilled" ? expiredDocsResult.value.data : [];
  const expiringLicenses = expiringLicensesResult.status === "fulfilled" ? expiringLicensesResult.value.data : [];
  const nextServices = nextServicesResult.status === "fulfilled" ? nextServicesResult.value.data : [];

  const alertTotal = (expiredDocs?.length ?? 0) + (expiringDocs?.length ?? 0);

  // Cumplimiento de kilometraje — solo para admin / editor
  const { data: { user } } = await supabase.auth.getUser();
  let isManager = false;
  if (user) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isManager = prof?.role === "admin" || prof?.role === "editor";
  }

  let kmCompliance: { driver: string; vehicleId: string; vehicle: string; days: number | null }[] = [];
  if (isManager) {
    const [{ data: linkedForKm }, { data: readings }] = await Promise.all([
      supabase
        .from("vehicle_drivers")
        .select("driver_name, vehicle:vehicles(id, brand, model, plate)")
        .is("end_date", null)
        .not("profile_id", "is", null),
      supabase
        .from("odometer_readings")
        .select("vehicle_id, reading_date")
        .order("reading_date", { ascending: false }),
    ]);

    const latestByVehicle: Record<string, string> = {};
    for (const r of readings ?? []) {
      if (!latestByVehicle[r.vehicle_id]) latestByVehicle[r.vehicle_id] = r.reading_date;
    }

    kmCompliance = (linkedForKm ?? [])
      .map((ld) => {
        const v = ld.vehicle as unknown as { id: string; brand: string; model: string; plate: string };
        const last = latestByVehicle[v.id];
        return {
          driver: ld.driver_name,
          vehicleId: v.id,
          vehicle: `${v.brand} ${v.model} (${v.plate})`,
          days: last ? daysSince(last) : null,
        };
      })
      .sort((a, b) => (b.days ?? 99999) - (a.days ?? 99999));
  }

  const kmAtrasados = kmCompliance.filter((k) => k.days === null || k.days >= 7).length;

  // Mantenciones preventivas por vencer — solo para admin / editor
  const preventiveDue: {
    vehicleId: string; vehicle: string; type: string; level: "overdue" | "soon"; detail: string;
  }[] = [];
  if (isManager) {
    const [{ data: planRows }, { data: vehRows }, { data: maintRows }] = await Promise.all([
      supabase.from("maintenance_plans").select("*").eq("active", true),
      supabase.from("vehicles").select("id, brand, model, plate, current_km, usage_unit"),
      supabase.from("maintenances").select("vehicle_id, type, km_at_service, date").order("date", { ascending: false }),
    ]);

    const vehMap: Record<string, { brand: string; model: string; plate: string; current_km: number; usage_unit: "km" | "horas" }> = {};
    for (const v of vehRows ?? []) vehMap[v.id] = v as typeof vehMap[string];

    const lastMap: Record<string, { km_at_service: number; date: string }> = {};
    for (const m of maintRows ?? []) {
      const key = `${m.vehicle_id}|${m.type}`;
      if (!lastMap[key]) lastMap[key] = { km_at_service: m.km_at_service, date: m.date };
    }

    for (const plan of planRows ?? []) {
      const veh = vehMap[plan.vehicle_id];
      if (!veh) continue;
      const last = lastMap[`${plan.vehicle_id}|${plan.type}`] ?? null;
      const st = computePlanStatus(plan as MaintenancePlanType, last, veh.current_km, veh.usage_unit);
      if (st.level !== "overdue" && st.level !== "soon") continue;
      const us = veh.usage_unit === "horas" ? "h" : "km";
      const parts: string[] = [];
      if (st.remainingValue !== null) {
        parts.push(st.remainingValue <= 0
          ? `vencida por ${Math.abs(st.remainingValue).toLocaleString("es-CL")} ${us}`
          : `faltan ${st.remainingValue.toLocaleString("es-CL")} ${us}`);
      }
      if (st.daysLeft !== null) {
        parts.push(st.daysLeft <= 0 ? `vencida hace ${Math.abs(st.daysLeft)} días` : `${st.daysLeft} días`);
      }
      preventiveDue.push({
        vehicleId: plan.vehicle_id,
        vehicle: `${veh.brand} ${veh.model} (${veh.plate})`,
        type: plan.type,
        level: st.level,
        detail: parts.join(" · "),
      });
    }
    preventiveDue.sort((a, b) => (a.level === b.level ? 0 : a.level === "overdue" ? -1 : 1));
  }

  const stats = [
    { label: "Total Vehículos", value: totalVehicles ?? 0, icon: Truck, color: "bg-blue-500", href: "/dashboard/vehiculos" },
    { label: "Vehículos Activos", value: activeVehicles ?? 0, icon: CheckCircle, color: "bg-green-500", href: "/dashboard/vehiculos?status=activo" },
    { label: "En Mantención", value: inMaintenance ?? 0, icon: Wrench, color: "bg-yellow-500", href: "/dashboard/vehiculos?status=en_mantencion" },
    { label: "Alertas Documentos", value: alertTotal, icon: FileWarning, color: alertTotal > 0 ? "bg-red-500" : "bg-gray-400", href: "/dashboard/documentos" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Resumen general de la flota</p>
      </div>

      {/* Alerta crítica si hay docs vencidos */}
      {expiredDocs && expiredDocs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700 text-sm">
              {expiredDocs.length} documento(s) vencido(s) — requieren renovación urgente
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {expiredDocs.slice(0, 3).map((doc) => {
                const v = doc.vehicle as { brand: string; model: string; plate: string } | null;
                return (
                  <Link key={doc.id} href={`/dashboard/documentos/${doc.id}`}
                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full hover:bg-red-200 transition">
                    {doc.label} — {v?.plate}
                  </Link>
                );
              })}
              {expiredDocs.length > 3 && (
                <Link href="/dashboard/documentos?estado=vencido" className="text-xs text-red-600 hover:underline">
                  +{expiredDocs.length - 3} más →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${color} p-3 rounded-xl`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Panel de cumplimiento de kilometraje (admin/editor) */}
      {isManager && kmCompliance.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-construserv-orange" />
              Control de Uso (km / horas)
            </h3>
            {kmAtrasados > 0 ? (
              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                {kmAtrasados} atrasado(s)
              </span>
            ) : (
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                Todos al día
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {kmCompliance.map((k) => {
              const isLate = k.days === null || k.days >= 7;
              const isWarn = k.days !== null && k.days >= 3 && k.days < 7;
              const label =
                k.days === null ? "Nunca ha reportado"
                : k.days === 0 ? "Reportó hoy"
                : k.days === 1 ? "Hace 1 día"
                : `Hace ${k.days} días`;
              return (
                <Link
                  key={k.vehicleId}
                  href={`/dashboard/vehiculos/${k.vehicleId}`}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{k.driver}</p>
                    <p className="text-xs text-gray-500">{k.vehicle}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isLate ? "bg-red-100 text-red-700" :
                    isWarn ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mantenciones preventivas por vencer (admin/editor) */}
      {isManager && preventiveDue.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-100 shadow-sm">
          <div className="p-5 border-b border-orange-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-construserv-orange" />
              Mantenciones Preventivas por Vencer
            </h3>
            <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
              {preventiveDue.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {preventiveDue.map((p, i) => (
              <Link
                key={`${p.vehicleId}-${p.type}-${i}`}
                href={`/dashboard/vehiculos/${p.vehicleId}`}
                className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {MAINT_TYPE_LABELS[p.type] ?? p.type} — {p.vehicle}
                  </p>
                  <p className="text-xs text-gray-500">{p.detail}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  p.level === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {p.level === "overdue" ? "Vencida" : "Próxima"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos por vencer */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Documentos por Vencer (30 días)
            </h3>
            <Link href="/dashboard/documentos?estado=proximo" className="text-construserv-orange text-sm hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!expiringDocs || expiringDocs.length === 0 ? (
              <p className="p-5 text-gray-400 text-sm text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Sin documentos próximos a vencer
              </p>
            ) : (
              expiringDocs.map((doc: VehicleDocument & { vehicle: { plate: string; brand: string; model: string } }) => {
                const days = getDaysUntil(doc.expiry_date);
                const color = getAlertColor(days);
                return (
                  <Link key={doc.id} href={`/dashboard/documentos/${doc.id}`}
                    className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{doc.label}</p>
                      <p className="text-xs text-gray-500">
                        {doc.vehicle?.brand} {doc.vehicle?.model} — {doc.vehicle?.plate}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        color === "red" ? "bg-red-100 text-red-700" :
                        color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {days === 0 ? "Hoy" : `${days}d`}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(doc.expiry_date)}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Últimas mantenciones */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-construserv-orange" />
              Últimas Mantenciones
            </h3>
            <Link href="/dashboard/mantenciones" className="text-construserv-orange text-sm hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!recentMaintenances || recentMaintenances.length === 0 ? (
              <p className="p-5 text-gray-400 text-sm text-center">No hay mantenciones registradas</p>
            ) : (
              recentMaintenances.map((m) => (
                <Link key={m.id} href={`/dashboard/mantenciones/${m.id}`}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{m.type}</p>
                    <p className="text-xs text-gray-500">
                      {(m.vehicle as { plate: string; brand: string; model: string })?.brand}{" "}
                      {(m.vehicle as { plate: string; brand: string; model: string })?.model} —{" "}
                      {(m.vehicle as { plate: string; brand: string; model: string })?.plate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(m.total_cost)}</p>
                    <p className="text-xs text-gray-400">{formatDate(m.date)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Próximas mantenciones programadas */}
        {nextServices && nextServices.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-100 shadow-sm">
            <div className="p-5 border-b border-orange-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-500" />
                Mantenciones Programadas (próx. 30 días)
              </h3>
              <Link href="/dashboard/mantenciones" className="text-construserv-orange text-sm hover:underline">
                Ver todas
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {nextServices.map((m) => {
                const v = m.vehicle as unknown as { plate: string; brand: string; model: string } | null;
                const days = m.next_service_date ? getDaysUntil(m.next_service_date) : null;
                return (
                  <div key={m.vehicle_id + m.next_service_date} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{v?.brand} {v?.model}</p>
                      <p className="text-xs text-gray-500">{v?.plate}</p>
                    </div>
                    <div className="text-right">
                      {days !== null && (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          days <= 0 ? "bg-red-100 text-red-700" :
                          days <= 7 ? "bg-orange-100 text-orange-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {days <= 0 ? "Hoy / Vencida" : `${days}d`}
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(m.next_service_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Licencias por vencer */}
        {expiringLicenses && expiringLicenses.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm">
            <div className="p-5 border-b border-orange-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-orange-500" />
                Licencias por Vencer (30 días)
              </h3>
              <Link href="/dashboard/conductores" className="text-construserv-orange text-sm hover:underline">
                Ver conductores
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {expiringLicenses.map((d) => {
                const days = getDaysUntil(d.license_expiry);
                const color = getAlertColor(days);
                const veh = d.vehicle as { plate: string; brand: string; model: string } | null;
                return (
                  <Link key={d.id} href={`/dashboard/conductores/${d.id}`}
                    className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.driver_name}</p>
                      <p className="text-xs text-gray-500">
                        {d.license_type && <span className="font-medium">Lic. {d.license_type} — </span>}
                        {veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "Sin vehículo"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        days < 0 ? "bg-red-100 text-red-700" :
                        color === "red" ? "bg-red-100 text-red-700" :
                        color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {days < 0 ? "Vencida" : days === 0 ? "Hoy" : `${days}d`}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(d.license_expiry)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
