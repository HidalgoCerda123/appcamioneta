import { createClient } from "@/lib/supabase/server";
import DocumentForm from "@/components/documents/DocumentForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle_id?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, plate, brand, model")
    .order("brand");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/documentos" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nuevo Documento</h2>
          <p className="text-gray-500 text-sm mt-0.5">Registra un documento o certificado del vehículo</p>
        </div>
      </div>
      <DocumentForm vehicles={vehicles ?? []} preselectedVehicleId={params.vehicle_id} />
    </div>
  );
}
