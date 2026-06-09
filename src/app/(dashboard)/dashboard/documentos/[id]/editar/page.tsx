import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import DocumentForm from "@/components/documents/DocumentForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: document }, { data: vehicles }] = await Promise.all([
    supabase.from("vehicle_documents").select("*").eq("id", id).single(),
    supabase.from("vehicles").select("id, plate, brand, model, usage_unit").order("brand"),
  ]);

  if (!document) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/documentos/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Editar Documento</h2>
          <p className="text-gray-500 text-sm mt-0.5">{document.label}</p>
        </div>
      </div>
      <DocumentForm vehicles={vehicles ?? []} document={document} />
    </div>
  );
}
