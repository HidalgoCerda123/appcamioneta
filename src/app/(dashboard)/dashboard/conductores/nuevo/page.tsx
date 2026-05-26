import { createClient } from "@/lib/supabase/server";
import DriverForm from "@/components/drivers/DriverForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Nuevo Conductor" };

export default async function NewDriverPage() {
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, plate, brand, model")
    .eq("status", "activo")
    .order("brand");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/conductores" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nuevo Conductor</h2>
          <p className="text-gray-500 text-sm mt-0.5">Registra los datos del conductor y su vehículo asignado</p>
        </div>
      </div>
      <DriverForm vehicles={vehicles ?? []} />
    </div>
  );
}
