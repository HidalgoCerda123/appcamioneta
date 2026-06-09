import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck, Gauge, Wrench, FileText, Pencil, Clock, ClipboardCheck } from "lucide-react";
import DeleteButton from "@/components/ui/DeleteButton";
import { formatCurrency, formatDate, formatUsage, getDaysUntil, getAlertColor } from "@/lib/utils";
import DriverSection from "@/components/vehicles/DriverSection";
import VehicleKmCard from "@/components/odometer/VehicleKmCard";
import MaintenancePlans from "@/components/maintenances/MaintenancePlans";
import type { LastService } from "@/lib/maintenance";

const statusConfig = {
  activo: { label: "Activo", class: "bg-green-100 text-green-700" },
  en_mantencion: { label: "En Mantención", class: "bg-yellow-100 text-yellow-700" },
  fuera_de_servicio: { label: "Fuera de Servicio", class: "bg-red-100 text-red-700" },
};

const typeLabels: Record<string, string> = {
  camioneta: "Camioneta",
  camion: "Camión",
  maquinaria_pesada: "Maquinaria Pesada",
  furgon: "Furgón",
  otro: "Otro",
};

const maintenanceTypeLabels: Record<string, string> = {
  aceite: "Aceite",
  frenos: "Frenos",
  neumaticos: "Neumáticos",
  filtros: "Filtros",
  suspension: "Suspensión",
  electrico: "Eléctrico",
  general: "General",
  otro: "Otro",
};

const docTypeLabels: Record<string, string> = {
  revision_tecnica: "Revisión Técnica",
  soap: "SOAP",
  permiso_circulacion: "Permiso de Circulación",
  seguro: "Seguro",
  licencia_operador: "Licencia Operador",
  otro: "Otro",
};

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: vehicle }, { data: maintenances }, { data: documents }, { data: drivers }, { data: kmReadings }, { data: plans }, { data: { user } }, { data: inspections }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).single(),
    supabase.from("maintenances").select("*").eq("vehicle_id", id).order("date", { ascending: false }),
    supabase.from("vehicle_documents").select("*").eq("vehicle_id", id).order("expiry_date", { ascending: true }),
    supabase.from("vehicle_drivers").select("*").eq("vehicle_id", id).order("start_date", { ascending: false }),
    supabase.from("odometer_readings").select("id, km, reading_date, source, driver_name").eq("vehicle_id", id).order("reading_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("maintenance_plans").select("*").eq("vehicle_id", id).order("created_at", { ascending: true }),
    supabase.auth.getUser(),
    supabase.from("inspections").select("id, inspection_date, driver_name, has_issues, items, notes").eq("vehicle_id", id).order("inspection_date", { ascending: false }).limit(10),
  ]);

  let canEditPlans = false;
  if (user) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    canEditPlans = prof?.role === "admin" || prof?.role === "editor";
  }

  // Próxima mantención programada (la más reciente con next_service_date o next_service_km)
  const nextMaint = maintenances?.find((m) => m.next_service_date || m.next_service_km);

  if (!vehicle) notFound();

  const status = statusConfig[vehicle.status as keyof typeof statusConfig];
  const totalMaintenance = maintenances?.reduce((sum, m) => sum + m.total_cost, 0) ?? 0;
  const totalDocuments = documents?.reduce((sum, d) => sum + (d.amount_paid ?? 0), 0) ?? 0;
  const totalSpend = totalMaintenance + totalDocuments;

  // Última mantención por tipo (para planes preventivos); maintenances viene ordenado por fecha desc
  const lastByType: Record<string, LastService> = {};
  for (const m of maintenances ?? []) {
    if (!lastByType[m.type]) lastByType[m.type] = { km_at_service: m.km_at_service, date: m.date };
  }

  // Costo por km/hora según el uso registrado
  const readingVals = (kmReadings ?? []).map((r) => r.km);
  const usageSpan = readingVals.length >= 2 ? Math.max(...readingVals) - Math.min(...readingVals) : 0;
  const costPerUsage = usageSpan > 0 ? Math.round(totalSpend / usageSpan) : null;
  const unitShort = vehicle.usage_unit === "horas" ? "h" : "km";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/vehiculos" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {vehicle.brand} {vehicle.model}
          </h2>
          <p className="text-gray-500 text-sm">{vehicle.plate} — {vehicle.year}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/vehiculos/${id}/editar`}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
          <DeleteButton
            table="vehicles"
            id={id}
            redirectTo="/dashboard/vehiculos"
            confirmText="Se eliminará este vehículo y todos sus datos asociados permanentemente."
          />
        </div>
      </div>

      {/* Alerta próxima mantención */}
      {nextMaint && (nextMaint.next_service_date || nextMaint.next_service_km) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Wrench className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">
            <span className="font-semibold">Próxima mantención programada: </span>
            {nextMaint.next_service_date && (
              <span>
                {formatDate(nextMaint.next_service_date)}
                {getDaysUntil(nextMaint.next_service_date) <= 0
                  ? " — vencida"
                  : ` — en ${getDaysUntil(nextMaint.next_service_date)} días`}
              </span>
            )}
            {nextMaint.next_service_date && nextMaint.next_service_km && " · "}
            {nextMaint.next_service_km && <span>a {formatUsage(nextMaint.next_service_km, vehicle.usage_unit)}</span>}
          </p>
        </div>
      )}

      {/* Ficha del vehículo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
          {vehicle.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vehicle.photo_url}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full sm:w-32 h-40 sm:h-32 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-full sm:w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Truck className="w-12 h-12 text-gray-300" />
            </div>
          )}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Patente</p>
              <p className="font-semibold text-gray-800 mt-0.5">{vehicle.plate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Tipo</p>
              <p className="font-semibold text-gray-800 mt-0.5">{typeLabels[vehicle.type]}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Estado</p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${status.class}`}>
                {status.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                {vehicle.usage_unit === "horas" ? "Horómetro" : "Kilometraje"}
              </p>
              <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-gray-400" />
                {formatUsage(vehicle.current_km, vehicle.usage_unit)}
              </p>
            </div>
            {vehicle.color && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Color</p>
                <p className="font-semibold text-gray-800 mt-0.5">{vehicle.color}</p>
              </div>
            )}
            {vehicle.vin && (
              <div className="col-span-2 md:col-span-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">VIN / Chasis</p>
                <p className="font-semibold text-gray-800 mt-0.5 text-xs font-mono break-all">{vehicle.vin}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Gasto Total</p>
              <p className="font-semibold text-construserv-orange mt-0.5">{formatCurrency(totalSpend)}</p>
            </div>
            {costPerUsage !== null && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Costo por {unitShort}</p>
                <p className="font-semibold text-gray-800 mt-0.5">{formatCurrency(costPerUsage)}/{unitShort}</p>
              </div>
            )}
          </div>
        </div>
        {vehicle.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notas</p>
            <p className="text-sm text-gray-600">{vehicle.notes}</p>
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          Registrado el {new Date(vehicle.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Kilometraje */}
      <VehicleKmCard
        vehicleId={id}
        vehicleLabel={`${vehicle.brand} ${vehicle.model} — ${vehicle.plate}`}
        currentKm={vehicle.current_km}
        readings={kmReadings ?? []}
        unit={vehicle.usage_unit}
      />

      {/* Mantención preventiva */}
      <MaintenancePlans
        vehicleId={id}
        unit={vehicle.usage_unit}
        currentValue={vehicle.current_km}
        plans={plans ?? []}
        lastByType={lastByType}
        canEdit={canEditPlans}
      />

      {/* Conductor */}
      <DriverSection vehicleId={id} vehicleStatus={vehicle.status} drivers={drivers ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Documentos
            </h3>
            <Link
              href={`/dashboard/documentos/nuevo?vehicle_id=${id}`}
              className="text-construserv-orange text-sm hover:underline"
            >
              + Agregar
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!documents || documents.length === 0 ? (
              <p className="p-5 text-gray-400 text-sm text-center">Sin documentos registrados</p>
            ) : (
              documents.map((doc) => {
                const days = getDaysUntil(doc.expiry_date);
                const color = getAlertColor(days);
                return (
                  <Link key={doc.id} href={`/dashboard/documentos/${doc.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{doc.label}</p>
                      <p className="text-xs text-gray-400">{docTypeLabels[doc.type]} — vence {formatDate(doc.expiry_date)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      days < 0 ? "bg-red-100 text-red-700" :
                      color === "red" ? "bg-red-100 text-red-700" :
                      color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {days < 0 ? "Vencido" : days === 0 ? "Hoy" : `${days}d`}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Mantenciones */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-construserv-orange" />
              Historial de Mantenciones
            </h3>
            <Link
              href={`/dashboard/mantenciones/nueva?vehicle_id=${id}`}
              className="text-construserv-orange text-sm hover:underline"
            >
              + Agregar
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!maintenances || maintenances.length === 0 ? (
              <p className="p-5 text-gray-400 text-sm text-center">Sin mantenciones registradas</p>
            ) : (
              maintenances.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">
                      {maintenanceTypeLabels[m.type] ?? m.type}
                    </p>
                    <p className="text-xs text-gray-400">{m.workshop_name} — {formatUsage(m.km_at_service, vehicle.usage_unit)}</p>
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

      {/* Inspecciones recientes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-construserv-orange" />
          <h3 className="font-semibold text-gray-800">Inspecciones Pre-Uso Recientes</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {!inspections || inspections.length === 0 ? (
            <p className="p-5 text-gray-400 text-sm text-center">Sin inspecciones registradas</p>
          ) : (
            inspections.map((insp) => {
              const items = (insp.items ?? []) as { label: string; status: string; note?: string }[];
              const fails = items.filter((it) => it.status === "fail");
              return (
                <div key={insp.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{formatDate(insp.inspection_date)}</p>
                      {insp.driver_name && <p className="text-xs text-gray-400">{insp.driver_name}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${insp.has_issues ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                      {insp.has_issues ? `${fails.length} problema(s)` : "Sin problemas"}
                    </span>
                  </div>
                  {fails.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {fails.map((f) => f.label.split(" (")[0]).join(", ")}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
