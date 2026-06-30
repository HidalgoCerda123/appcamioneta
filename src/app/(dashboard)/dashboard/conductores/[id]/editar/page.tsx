import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DriverForm from "@/components/drivers/DriverForm";

export const metadata = { title: "Editar Conductor" };

export default async function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin" && prof?.role !== "editor") redirect(`/dashboard/conductores/${id}`);

  const [{ data: driver }, { data: vehicles }] = await Promise.all([
    supabase.from("vehicle_drivers").select("*").eq("id", id).single(),
    supabase.from("vehicles").select("id, plate, brand, model").order("brand"),
  ]);

  if (!driver) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/conductores/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Editar Conductor</h2>
          <p className="text-gray-500 text-sm mt-0.5">{driver.driver_name}</p>
        </div>
      </div>
      <DriverForm vehicles={vehicles ?? []} driver={driver} />
    </div>
  );
}
