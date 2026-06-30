import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  CreditCard,
  FileText,
  Calendar,
  Truck,
  HardHat,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { formatDate, getDaysUntil, getAlertColor } from "@/lib/utils";
import LinkDriverProfile from "@/components/drivers/LinkDriverProfile";

const LICENSE_TYPE_LABELS: Record<string, string> = {
  A1: "A1 — Motocicletas hasta 50cc",
  A2: "A2 — Motocicletas sobre 50cc",
  A3: "A3 — Triciclos y cuadriciclos",
  A4: "A4 — Vehículos especiales menores",
  B: "B — Automóviles y camionetas hasta 3.500 kg",
  C: "C — Camiones y vehículos sobre 3.500 kg",
  D: "D — Buses y minibuses",
  E: "E — Maquinaria pesada",
};

const DOC_LABELS: { key: string; label: string }[] = [
  { key: "license_front_url", label: "Licencia (anverso)" },
  { key: "license_back_url", label: "Licencia (reverso)" },
  { key: "id_front_url", label: "Carnet / Cédula (anverso)" },
  { key: "id_back_url", label: "Carnet / Cédula (reverso)" },
  { key: "cv_url", label: "Hoja de vida" },
];

function isImage(url: string) {
  return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url);
}

function FilePreview({ url, label }: { url: string; label: string }) {
  if (isImage(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="w-full h-36 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 hover:bg-blue-100 transition"
    >
      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
      <span className="text-sm text-blue-700 font-medium">Ver PDF</span>
    </a>
  );
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: driver } = await supabase
    .from("vehicle_drivers")
    .select("*, vehicle:vehicles(id, plate, brand, model, year)")
    .eq("id", id)
    .single();

  if (!driver) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let canEdit = false;
  if (user) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    canEdit = prof?.role === "admin" || prof?.role === "editor";
  }

  // Todos los registros del mismo conductor (misma persona) para historial completo
  const [{ data: history }, { data: allProfiles }] = await Promise.all([
    supabase
      .from("vehicle_drivers")
      .select("*, vehicle:vehicles(id, plate, brand, model)")
      .eq("driver_name", driver.driver_name)
      .order("start_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
  ]);

  // IDs de todos los registros de este conductor (para actualizar en bloque)
  const driverRecordIds = (history ?? []).map((h) => h.id);

  // Perfil vinculado (tomamos el del primer registro que tenga profile_id)
  const linkedProfileId = (history ?? []).find((h) => h.profile_id)?.profile_id ?? null;
  const linkedProfile = linkedProfileId
    ? (allProfiles ?? []).find((p) => p.id === linkedProfileId) ?? null
    : null;

  const licenseExpiry = driver.license_expiry ? getDaysUntil(driver.license_expiry) : null;
  const licenseColor = licenseExpiry !== null ? getAlertColor(licenseExpiry) : null;

  const docs = DOC_LABELS.filter(({ key }) => driver[key as keyof typeof driver]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/conductores" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{driver.driver_name}</h2>
          {driver.driver_rut && (
            <p className="text-gray-500 text-sm">RUT: {driver.driver_rut}</p>
          )}
        </div>
        {canEdit && (
          <Link
            href={`/dashboard/conductores/${id}/editar`}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
        )}
      </div>

      {/* Alerta vencimiento licencia */}
      {licenseExpiry !== null && licenseExpiry <= 30 && (
        <div className={`rounded-xl px-5 py-3 flex items-center gap-3 ${
          licenseExpiry < 0 ? "bg-red-50 border border-red-200" :
          licenseColor === "red" ? "bg-red-50 border border-red-200" :
          "bg-yellow-50 border border-yellow-200"
        }`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
            licenseExpiry < 0 || licenseColor === "red" ? "text-red-500" : "text-yellow-500"
          }`} />
          <p className={`text-sm font-medium ${
            licenseExpiry < 0 || licenseColor === "red" ? "text-red-700" : "text-yellow-700"
          }`}>
            {licenseExpiry < 0
              ? `Licencia vencida hace ${Math.abs(licenseExpiry)} días (${formatDate(driver.license_expiry)})`
              : licenseExpiry === 0
              ? "Licencia vence hoy"
              : `Licencia vence en ${licenseExpiry} días (${formatDate(driver.license_expiry)})`}
          </p>
        </div>
      )}

      {/* Ficha del conductor */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-construserv-orange flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {driver.driver_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
            {driver.driver_rut && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> RUT
                </p>
                <p className="font-semibold text-gray-800 mt-0.5">{driver.driver_rut}</p>
              </div>
            )}
            {driver.driver_phone && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Teléfono
                </p>
                <p className="font-semibold text-gray-800 mt-0.5">{driver.driver_phone}</p>
              </div>
            )}
            {driver.driver_license && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <FileText className="w-3 h-3" /> N° Licencia
                </p>
                <p className="font-semibold text-gray-800 mt-0.5">{driver.driver_license}</p>
              </div>
            )}
            {driver.license_type && (
              <div className="col-span-2 md:col-span-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Tipo Licencia</p>
                <p className="font-semibold text-gray-800 mt-0.5 text-sm">
                  <span className="font-bold">{driver.license_type}</span>
                  {LICENSE_TYPE_LABELS[driver.license_type] ? ` — ${LICENSE_TYPE_LABELS[driver.license_type].split("—")[1]?.trim()}` : ""}
                </p>
              </div>
            )}
            {driver.license_expiry && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Venc. Licencia
                </p>
                <p className={`font-semibold mt-0.5 ${
                  licenseColor === "red" ? "text-red-600" :
                  licenseColor === "yellow" ? "text-yellow-600" :
                  "text-gray-800"
                }`}>
                  {formatDate(driver.license_expiry)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Inicio asignación
              </p>
              <p className="font-semibold text-gray-800 mt-0.5">{formatDate(driver.start_date)}</p>
            </div>
          </div>
        </div>
        {driver.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notas</p>
            <p className="text-sm text-gray-600">{driver.notes}</p>
          </div>
        )}
      </div>

      {/* Vehículo actual */}
      {!driver.end_date && driver.vehicle && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-green-500" />
            Vehículo Asignado
          </h3>
          {(() => {
            const veh = driver.vehicle as { id: string; plate: string; brand: string; model: string; year: number };
            return (
              <Link
                href={`/dashboard/vehiculos/${veh.id}`}
                className="flex items-center gap-3 hover:text-construserv-orange transition"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{veh.brand} {veh.model}</p>
                  <p className="text-sm text-gray-500">{veh.year} — {veh.plate}</p>
                </div>
              </Link>
            );
          })()}
        </div>
      )}

      {/* Vinculación con cuenta de usuario */}
      <LinkDriverProfile
        driverRecordIds={driverRecordIds}
        driverName={driver.driver_name}
        linkedProfile={linkedProfile}
        allProfiles={allProfiles ?? []}
      />

      {/* Documentos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <HardHat className="w-4 h-4 text-construserv-orange" />
          Documentos del Conductor
        </h3>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Sin documentos subidos. Ingresa al vehículo asignado para agregar documentos.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {docs.map(({ key, label }) => {
              const url = driver[key as keyof typeof driver] as string;
              return (
                <div key={key}>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
                  <FilePreview url={url} label={label} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de vehículos */}
      {history && history.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Historial de Vehículos</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map((h) => {
              const veh = h.vehicle as { id: string; plate: string; brand: string; model: string } | null;
              return (
                <div key={h.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    {veh ? (
                      <Link href={`/dashboard/vehiculos/${veh.id}`} className="text-sm font-medium text-gray-800 hover:text-construserv-orange transition">
                        {veh.brand} {veh.model} — {veh.plate}
                      </Link>
                    ) : (
                      <p className="text-sm text-gray-400">Vehículo no disponible</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(h.start_date)} → {h.end_date ? formatDate(h.end_date) : "Activo"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
