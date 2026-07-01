import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FuelLoadForm from "@/components/fuel/FuelLoadForm";
import DeleteButton from "@/components/ui/DeleteButton";

export const metadata = { title: "Editar Carga" };

export default async function EditFuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const canEdit = prof?.role === "admin" || prof?.role === "editor";
  const isAdmin = prof?.role === "admin";
  if (!canEdit) redirect("/dashboard/combustible");

  const [{ data: fuelLoad }, { data: vehicles }] = await Promise.all([
    supabase.from("fuel_loads").select("*").eq("id", id).single(),
    supabase.from("vehicles").select("id, plate, brand, model, current_km, usage_unit").order("brand"),
  ]);

  if (!fuelLoad) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/combustible" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Editar Carga</h2>
            <p className="text-gray-500 text-sm mt-0.5">Corrige los datos de esta carga de combustible</p>
          </div>
        </div>
        {isAdmin && (
          <DeleteButton
            table="fuel_loads"
            id={id}
            redirectTo="/dashboard/combustible"
            confirmText="Se eliminará esta carga de combustible permanentemente."
          />
        )}
      </div>
      <FuelLoadForm vehicles={vehicles ?? []} fuelLoad={fuelLoad} />
    </div>
  );
}
