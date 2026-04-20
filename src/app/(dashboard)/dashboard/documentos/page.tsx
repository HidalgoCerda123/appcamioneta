import { createClient } from "@/lib/supabase/server";
import { Plus, FileText, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDate, getDaysUntil, getAlertColor } from "@/lib/utils";

export default async function DocumentsPage() {
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("vehicle_documents")
    .select("*, vehicle:vehicles(plate, brand, model)")
    .order("expiry_date", { ascending: true });

  const typeLabels: Record<string, string> = {
    revision_tecnica: "Revisión Técnica",
    soap: "SOAP",
    permiso_circulacion: "Permiso de Circulación",
    seguro: "Seguro",
    licencia_operador: "Licencia Operador",
    otro: "Otro",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documentos</h2>
          <p className="text-gray-500 text-sm mt-1">{documents?.length ?? 0} documentos registrados</p>
        </div>
        <Link
          href="/dashboard/documentos/nuevo"
          className="flex items-center gap-2 bg-construserv-orange hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Documento
        </Link>
      </div>

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
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Documento</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Tipo</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Vencimiento</th>
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
          </>
        )}
      </div>
    </div>
  );
}
