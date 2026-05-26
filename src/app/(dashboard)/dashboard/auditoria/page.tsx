export const metadata = { title: "Auditoría" };
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldCheck, User, Wrench, FileText, Truck, UserCheck } from "lucide-react";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "Creó",    color: "bg-green-100 text-green-700" },
  update: { label: "Editó",   color: "bg-blue-100 text-blue-700" },
  delete: { label: "Eliminó", color: "bg-red-100 text-red-700" },
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  vehicle:     <Truck className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
  document:    <FileText className="w-4 h-4" />,
  driver:      <UserCheck className="w-4 h-4" />,
  user:        <User className="w-4 h-4" />,
};

export default async function AuditoriaPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: logs } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Auditoría</h2>
        <p className="text-gray-500 text-sm mt-1">Registro de todas las acciones realizadas en el sistema</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-construserv-orange" />
          <h3 className="font-semibold text-gray-800">Últimas 200 acciones</h3>
        </div>

        {!logs || logs.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay registros de auditoría aún.</p>
            <p className="text-gray-400 text-xs mt-1">Las acciones del sistema comenzarán a aparecer aquí.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const action = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-700" };
              const icon = ENTITY_ICONS[log.entity] ?? <ShieldCheck className="w-4 h-4" />;
              const date = new Date(log.created_at);

              return (
                <div key={log.id} className="px-5 py-3 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{log.user_name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${action.color}`}>
                        {action.label}
                      </span>
                      <span className="text-sm text-gray-600">{log.description}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {date.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
