import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import MaintenanceForm from "@/components/maintenances/MaintenanceForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const DEFAULT_TYPES = ["aceite","frenos","neumaticos","filtros","suspension","electrico","general","otro"];

  const [{ data: maintenance }, { data: vehicles }, { data: allTypes }] = await Promise.all([
    supabase.from("maintenances").select("*").eq("id", id).single(),
    supabase.from("vehicles").select("id, plate, brand, model").order("brand"),
    supabase.from("maintenances").select("type"),
  ]);

  if (!maintenance) notFound();

  const customTypes = [...new Set((allTypes ?? []).map((r) => r.type).filter((t) => !DEFAULT_TYPES.includes(t)))];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/mantenciones/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Editar Mantención</h2>
          <p className="text-gray-500 text-sm mt-0.5">Modifica los datos del servicio</p>
        </div>
      </div>
      <MaintenanceForm vehicles={vehicles ?? []} maintenance={maintenance} customTypes={customTypes} />
    </div>
  );
}
