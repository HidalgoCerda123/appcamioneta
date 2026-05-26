import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, DollarSign, Building, Hash, Pencil, Clock } from "lucide-react";
import DeleteButton from "@/components/ui/DeleteButton";
import { formatCurrency, formatDate, getDaysUntil, getAlertColor } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  revision_tecnica: "Revisión Técnica",
  soap: "SOAP",
  permiso_circulacion: "Permiso de Circulación",
  seguro: "Seguro de Vehículo",
  licencia_operador: "Licencia de Operador",
  otro: "Otro",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("vehicle_documents")
    .select("*, vehicle:vehicles(id, plate, brand, model)")
    .eq("id", id)
    .single();

  // Recopilar todos los archivos del documento
  const rawUrls: string[] = [
    ...(doc?.file_urls ?? []),
    ...(doc?.document_url && !(doc?.file_urls ?? []).includes(doc.document_url) ? [doc.document_url] : []),
  ].filter(Boolean);

  // Generar URLs firmadas para el bucket privado
  const signedUrls: { url: string; signed: string }[] = [];
  for (const rawUrl of rawUrls) {
    const parts = rawUrl.split("/documents/");
    if (parts.length > 1) {
      const filePath = parts[1].split("?")[0];
      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(filePath, 3600);
      signedUrls.push({ url: rawUrl, signed: signed?.signedUrl ?? rawUrl });
    } else {
      signedUrls.push({ url: rawUrl, signed: rawUrl });
    }
  }

  if (!doc) notFound();

  const vehicle = doc.vehicle as { id: string; plate: string; brand: string; model: string };
  const days = getDaysUntil(doc.expiry_date);
  const color = getAlertColor(days);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/vehiculos/${vehicle?.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{doc.label}</h2>
          <p className="text-gray-500 text-sm">{vehicle?.brand} {vehicle?.model} — {vehicle?.plate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/documentos/${id}/editar`}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
          <DeleteButton
            table="vehicle_documents"
            id={id}
            redirectTo="/dashboard/documentos"
            confirmText="Se eliminará este documento permanentemente."
          />
        </div>
      </div>

      {/* Estado de vencimiento */}
      <div className={`rounded-xl p-4 flex items-center justify-between ${
        days < 0 ? "bg-red-50 border border-red-200" :
        color === "red" ? "bg-red-50 border border-red-200" :
        color === "yellow" ? "bg-yellow-50 border border-yellow-200" :
        "bg-green-50 border border-green-200"
      }`}>
        <div>
          <p className={`font-semibold ${
            days < 0 ? "text-red-700" :
            color === "red" ? "text-red-700" :
            color === "yellow" ? "text-yellow-700" :
            "text-green-700"
          }`}>
            {days < 0 ? "Documento Vencido" :
             days === 0 ? "Vence hoy" :
             `Vence en ${days} días`}
          </p>
          <p className={`text-sm mt-0.5 ${
            days < 0 ? "text-red-600" :
            color === "red" ? "text-red-600" :
            color === "yellow" ? "text-yellow-600" :
            "text-green-600"
          }`}>
            Fecha de vencimiento: {formatDate(doc.expiry_date)}
          </p>
        </div>
        <span className={`text-2xl font-bold ${
          days < 0 ? "text-red-700" :
          color === "red" ? "text-red-700" :
          color === "yellow" ? "text-yellow-700" :
          "text-green-700"
        }`}>
          {days < 0 ? "VENCIDO" : `${days}d`}
        </span>
      </div>

      {/* Detalles */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Información del Documento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400">Tipo</p>
              <p className="font-medium text-gray-800 mt-0.5">{typeLabels[doc.type]}</p>
            </div>
          </div>

          {doc.issue_date && (
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Fecha de emisión</p>
                <p className="font-medium text-gray-800 mt-0.5">{formatDate(doc.issue_date)}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400">Fecha de vencimiento</p>
              <p className="font-medium text-gray-800 mt-0.5">{formatDate(doc.expiry_date)}</p>
            </div>
          </div>

          {doc.amount_paid != null && (
            <div className="flex items-start gap-3">
              <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Monto pagado</p>
                <p className="font-medium text-gray-800 mt-0.5">{formatCurrency(doc.amount_paid)}</p>
              </div>
            </div>
          )}

          {doc.issuer && (
            <div className="flex items-start gap-3">
              <Building className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Emisor / Aseguradora</p>
                <p className="font-medium text-gray-800 mt-0.5">{doc.issuer}</p>
              </div>
            </div>
          )}

          {doc.policy_number && (
            <div className="flex items-start gap-3">
              <Hash className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">N° Póliza / Folio</p>
                <p className="font-medium text-gray-800 mt-0.5">{doc.policy_number}</p>
              </div>
            </div>
          )}
        </div>

        {doc.notes && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Notas</p>
            <p className="text-sm text-gray-700">{doc.notes}</p>
          </div>
        )}
      </div>

      {/* Archivo adjunto */}
      {signedUrls.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-3">
            Archivos Adjuntos ({signedUrls.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {signedUrls.map(({ signed }, i) => {
              const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(signed);
              return isImage ? (
                <a key={i} href={signed} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signed} alt={`Archivo ${i + 1}`} className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition border border-gray-100" />
                </a>
              ) : (
                <a key={i} href={signed} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-3 rounded-lg text-sm font-medium transition">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">Documento {i + 1}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
      {/* Registro */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 pb-2">
        <Clock className="w-3.5 h-3.5" />
        Registrado el {new Date(doc.created_at).toLocaleString("es-CL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
