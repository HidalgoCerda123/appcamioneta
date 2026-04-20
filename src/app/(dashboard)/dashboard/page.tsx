import { createClient } from "@/lib/supabase/server";
import { Truck, Wrench, FileWarning, AlertTriangle, CheckCircle, UserCheck } from "lucide-react";
import { formatCurrency, formatDate, getDaysUntil, getAlertColor } from "@/lib/utils";
import Link from "next/link";
import type { VehicleDocument } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    { count: totalVehicles },
    { count: activeVehicles },
    { count: inMaintenance },
    { data: recentMaintenances },
    { data: expiringDocs },
    { data: expiringLicenses },
  ] = await Promise.all([
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "activo"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "en_mantencion"),
    supabase
      .from("maintenances")
      .select("*, vehicle:vehicles(plate, brand, model)")
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("vehicle_documents")
      .select("*, vehicle:vehicles(plate, brand, model)")
      .gte("expiry_date", today)
      .lte("expiry_date", in30)
      .order("expiry_date", { ascending: true })
      .limit(8),
    supabase
      .from("vehicle_drivers")
      .select("*, vehicle:vehicles(plate, brand, model)")
      .is("end_date", null)
      .not("license_expiry", "is", null)
      .lte("license_expiry", in30)
      .order("license_expiry", { ascending: true }),
  ]);

  const stats = [
    {
      label: "Total Vehículos",
      value: totalVehicles ?? 0,
      icon: Truck,
      color: "bg-blue-500",
      href: "/dashboard/vehiculos",
    },
    {
      label: "Vehículos Activos",
      value: activeVehicles ?? 0,
      icon: CheckCircle,
      color: "bg-green-500",
      href: "/dashboard/vehiculos?status=activo",
    },
    {
      label: "En Mantención",
      value: inMaintenance ?? 0,
      icon: Wrench,
      color: "bg-yellow-500",
      href: "/dashboard/vehiculos?status=en_mantencion",
    },
    {
      label: "Docs. por Vencer",
      value: expiringDocs?.length ?? 0,
      icon: FileWarning,
      color: "bg-red-500",
      href: "/dashboard/documentos",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Resumen general de la flota</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition group"
          >
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos por vencer */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Documentos por Vencer (30 días)
            </h3>
            <Link href="/dashboard/documentos" className="text-construserv-orange text-sm hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!expiringDocs || expiringDocs.length === 0 ? (
              <p className="p-5 text-gray-400 text-sm text-center">
                No hay documentos por vencer en los próximos 30 días
              </p>
            ) : (
              expiringDocs.map((doc: VehicleDocument & { vehicle: { plate: string; brand: string; model: string } }) => {
                const days = getDaysUntil(doc.expiry_date);
                const color = getAlertColor(days);
                return (
                  <div key={doc.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{doc.label}</p>
                      <p className="text-xs text-gray-500">
                        {doc.vehicle?.brand} {doc.vehicle?.model} — {doc.vehicle?.plate}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          color === "red"
                            ? "bg-red-100 text-red-700"
                            : color === "yellow"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {days === 0 ? "Hoy" : days < 0 ? `Vencido` : `${days}d`}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(doc.expiry_date)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Licencias por vencer */}
        {expiringLicenses && expiringLicenses.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm lg:col-span-2">
            <div className="p-5 border-b border-orange-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-orange-500" />
                Licencias de Conductores por Vencer (30 días)
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {expiringLicenses.map((d) => {
                const days = getDaysUntil(d.license_expiry);
                const color = getAlertColor(days);
                const veh = d.vehicle as { plate: string; brand: string; model: string } | null;
                return (
                  <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.driver_name}</p>
                      <p className="text-xs text-gray-500">
                        {d.license_type && <span className="font-medium">Lic. {d.license_type} — </span>}
                        {veh ? `${veh.brand} ${veh.model} (${veh.plate})` : ""}
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              <p className="p-5 text-gray-400 text-sm text-center">
                No hay mantenciones registradas
              </p>
            ) : (
              recentMaintenances.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between">
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
