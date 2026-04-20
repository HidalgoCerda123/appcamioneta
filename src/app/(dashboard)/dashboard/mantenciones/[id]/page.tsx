import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench, MapPin, Phone, Gauge, Calendar, User, FileImage, Pencil } from "lucide-react";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  aceite: "Cambio de Aceite",
  frenos: "Frenos",
  neumaticos: "Neumáticos",
  filtros: "Filtros",
  suspension: "Suspensión",
  electrico: "Eléctrico",
  general: "Mantención General",
  otro: "Otro",
};

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: m } = await supabase
    .from("maintenances")
    .select("*, vehicle:vehicles(id, plate, brand, model)")
    .eq("id", id)
    .single();

  if (!m) notFound();

  const vehicle = m.vehicle as { id: string; plate: string; brand: string; model: string };
  const parts = (m.parts_replaced as { name: string; brand?: string; part_number?: string; quantity: number; unit_cost: number; warranty_months?: number }[]) ?? [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/vehiculos/${vehicle?.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {typeLabels[m.type] ?? m.type}
          </h2>
          <p className="text-gray-500 text-sm">{vehicle?.brand} {vehicle?.model} — {vehicle?.plate}</p>
        </div>
        <Link
          href={`/dashboard/mantenciones/${id}/editar`}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </Link>
      </div>

      {/* Info principal */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400">Fecha</p>
              <p className="font-semibold text-gray-800 text-sm">{formatDate(m.date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Gauge className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400">Kilometraje</p>
              <p className="font-semibold text-gray-800 text-sm">{formatKm(m.km_at_service)}</p>
            </div>
          </div>
          {m.performed_by && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Técnico</p>
                <p className="font-semibold text-gray-800 text-sm">{m.performed_by}</p>
              </div>
            </div>
          )}
          {m.next_service_km && (
            <div className="flex items-start gap-2">
              <Wrench className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Próximo km</p>
                <p className="font-semibold text-construserv-orange text-sm">{formatKm(m.next_service_km)}</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Descripción</p>
          <p className="text-sm text-gray-700">{m.description}</p>
        </div>
      </div>

      {/* Taller */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          Taller
        </h3>
        <p className="font-medium text-gray-800">{m.workshop_name}</p>
        {m.workshop_address && <p className="text-sm text-gray-500 mt-1">{m.workshop_address}</p>}
        {m.workshop_phone && (
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" /> {m.workshop_phone}
          </p>
        )}
      </div>

      {/* Piezas */}
      {parts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Piezas / Repuestos Cambiados</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-2.5 text-gray-500 font-medium text-xs">Pieza</th>
                <th className="text-left px-5 py-2.5 text-gray-500 font-medium text-xs">Marca / N° Parte</th>
                <th className="text-center px-5 py-2.5 text-gray-500 font-medium text-xs">Cant.</th>
                <th className="text-right px-5 py-2.5 text-gray-500 font-medium text-xs">Precio unit.</th>
                <th className="text-right px-5 py-2.5 text-gray-500 font-medium text-xs">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {parts.map((p, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 font-medium text-gray-800">{p.name}
                    {p.warranty_months ? <span className="ml-2 text-xs text-green-600">Gtía {p.warranty_months}m</span> : null}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{[p.brand, p.part_number].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-5 py-3 text-center text-gray-700">{p.quantity}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{formatCurrency(p.unit_cost)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">{formatCurrency(p.quantity * p.unit_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Costos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Resumen de Costos</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Mano de obra</span>
            <span className="font-medium text-gray-800">{formatCurrency(m.labor_cost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Repuestos</span>
            <span className="font-medium text-gray-800">{formatCurrency(m.parts_cost)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-2 mt-2">
            <span className="text-gray-800">Total</span>
            <span className="text-construserv-orange">{formatCurrency(m.total_cost)}</span>
          </div>
        </div>
      </div>

      {/* Archivos */}
      {(m.invoice_urls?.length > 0 || m.photo_urls?.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileImage className="w-4 h-4" />
            Archivos Adjuntos
          </h3>
          {m.invoice_urls?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Facturas / Boletas</p>
              <div className="flex flex-wrap gap-2">
                {m.invoice_urls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
                    Factura {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
          {m.photo_urls?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Fotos</p>
              <div className="grid grid-cols-3 gap-2">
                {m.photo_urls.map((url: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-24 object-cover rounded-lg hover:opacity-90 transition" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
