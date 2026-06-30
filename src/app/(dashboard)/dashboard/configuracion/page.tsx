import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldCheck, Bell } from "lucide-react";
import RoleManager from "@/components/admin/RoleManager";
import type { CustomRole } from "@/components/admin/RoleManager";
import ServiceLeadSettings from "@/components/admin/ServiceLeadSettings";

export const metadata = { title: 'Configuración' };

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: roles }, { data: settings }] = await Promise.all([
    supabase.from("custom_roles").select("*").order("name"),
    supabase.from("app_settings").select("km_service_lead, hours_service_lead").eq("id", "global").maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
        <p className="text-gray-500 text-sm mt-1">Gestiona roles personalizados y permisos del sistema</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-construserv-orange" />
          <h3 className="font-semibold text-gray-800">Aviso de Mantención por Kilometraje</h3>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Con cuánta anticipación quieres recibir la alerta antes de llegar al kilometraje (u horas)
          de la próxima mantención programada.
        </p>
        <ServiceLeadSettings
          initialKm={settings?.km_service_lead ?? 200}
          initialHours={settings?.hours_service_lead ?? 20}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-construserv-orange" />
          <h3 className="font-semibold text-gray-800">Roles y Permisos</h3>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Crea roles personalizados (Chofer, Mecánico, Supervisor, etc.) con permisos específicos por módulo.
          Luego asígnalos a cada usuario desde la sección <strong>Usuarios</strong>.
        </p>
        <RoleManager initialRoles={(roles ?? []) as CustomRole[]} />
      </div>
    </div>
  );
}
