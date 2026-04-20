import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VehicleForm from "@/components/vehicles/VehicleForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .single();

  if (!vehicle) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/vehiculos/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Editar Vehículo</h2>
          <p className="text-gray-500 text-sm mt-0.5">{vehicle.brand} {vehicle.model} — {vehicle.plate}</p>
        </div>
      </div>
      <VehicleForm vehicle={vehicle} />
    </div>
  );
}
