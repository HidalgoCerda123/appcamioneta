import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Building2, Calendar, Pencil, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import DeleteButton from "@/components/ui/DeleteButton";
import ProjectVehicleControl from "@/components/projects/ProjectVehicleControl";

export const metadata = { title: "Obra" };

function inInterval(date: string, start: string, end: string | null): boolean {
  if (date < start) return false;
  if (end && date > end) return false;
  return true;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: assignments }, { data: allVehicles }, { data: { user } }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("project_vehicles").select("*, vehicle:vehicles(id, plate, brand, model)").eq("project_id", id).order("start_date", { ascending: false }),
    supabase.from("vehicles").select("id, plate, brand, model").order("brand"),
    supabase.auth.getUser(),
  ]);

  if (!project) notFound();

  let canEdit = false;
  if (user) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    canEdit = prof?.role === "admin" || prof?.role === "editor";
  }

  const today = new Date().toISOString().split("T")[0];
  const vehicleIds = [...new Set((assignments ?? []).map((a) => a.vehicle_id))];

  // Costos de los vehículos que pasaron por la obra
  const [{ data: maints }, { data: docs }] = vehicleIds.length > 0
    ? await Promise.all([
        supabase.from("maintenances").select("vehicle_id, date, total_cost").in("vehicle_id", vehicleIds),
        supabase.from("vehicle_documents").select("vehicle_id, issue_date, amount_paid").in("vehicle_id", vehicleIds),
      ])
    : [{ data: [] }, { data: [] }];

  // Asignar costos por intervalo de cada asignación a la obra
  const costByVehicle: Record<string, number> = {};
  for (const a of assignments ?? []) {
    const end = a.end_date;
    for (const m of maints ?? []) {
      if (m.vehicle_id === a.vehicle_id && inInterval(m.date, a.start_date, end ?? today)) {
        costByVehicle[a.vehicle_id] = (costByVehicle[a.vehicle_id] ?? 0) + (m.total_cost ?? 0);
      }
    }
    for (const d of docs ?? []) {
      if (d.amount_paid && d.issue_date && d.vehicle_id === a.vehicle_id && inInterval(d.issue_date, a.start_date, end ?? today)) {
        costByVehicle[a.vehicle_id] = (costByVehicle[a.vehicle_id] ?? 0) + d.amount_paid;
      }
    }
  }
  const totalCost = Object.values(costByVehicle).reduce((s, n) => s + n, 0);

  // Mapa de nombre de vehículo
  const vehName: Record<string, string> = {};
  for (const a of assignments ?? []) {
    const v = a.vehicle as { plate: string; brand: string; model: string } | null;
    if (v) vehName[a.vehicle_id] = `${v.brand} ${v.model} (${v.plate})`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedAssignments = (assignments ?? []).map((a) => ({
    id: a.id, vehicle_id: a.vehicle_id, start_date: a.start_date, end_date: a.end_date,
    vehicle: a.vehicle as { id: string; plate: string; brand: string; model: string } | null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/obras" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${project.status === "activa" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {project.status === "activa" ? "Activa" : "Finalizada"}
            </span>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/obras/${id}/editar`} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              <Pencil className="w-4 h-4" /> Editar
            </Link>
            <DeleteButton table="projects" id={id} redirectTo="/dashboard/obras" confirmText="Se eliminará esta obra y sus asignaciones de vehículos." />
          </div>
        )}
      </div>

      {/* Info + costo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid grid-cols-2 gap-4">
          {project.client && (
            <div><p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1"><Building2 className="w-3 h-3" /> Cliente</p><p className="font-semibold text-gray-800 mt-0.5">{project.client}</p></div>
          )}
          {project.location && (
            <div><p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1"><MapPin className="w-3 h-3" /> Ubicación</p><p className="font-semibold text-gray-800 mt-0.5">{project.location}</p></div>
          )}
          {project.start_date && (
            <div><p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1"><Calendar className="w-3 h-3" /> Inicio</p><p className="font-semibold text-gray-800 mt-0.5">{formatDate(project.start_date)}</p></div>
          )}
          {project.end_date && (
            <div><p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1"><Calendar className="w-3 h-3" /> Término</p><p className="font-semibold text-gray-800 mt-0.5">{formatDate(project.end_date)}</p></div>
          )}
          {project.notes && (
            <div className="col-span-2 pt-2 border-t border-gray-100"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notas</p><p className="text-sm text-gray-600">{project.notes}</p></div>
          )}
        </div>
        <div className="bg-construserv-dark rounded-xl shadow-sm p-6 flex flex-col justify-center">
          <p className="text-xs text-gray-300 uppercase tracking-wide flex items-center gap-1"><DollarSign className="w-3 h-3" /> Costo de maquinaria en la obra</p>
          <p className="text-3xl font-bold text-white mt-2">{formatCurrency(totalCost)}</p>
          <p className="text-xs text-gray-400 mt-1">Mantenciones + documentos de los vehículos asignados</p>
        </div>
      </div>

      {/* Vehículos asignados */}
      <ProjectVehicleControl projectId={id} vehicles={allVehicles ?? []} assignments={typedAssignments} canEdit={canEdit} />

      {/* Desglose de costo por vehículo */}
      {Object.keys(costByVehicle).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Costo por Vehículo en la Obra</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {Object.entries(costByVehicle).sort((a, b) => b[1] - a[1]).map(([vid, cost]) => (
              <div key={vid} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">{vehName[vid] ?? "—"}</p>
                <span className="font-bold text-construserv-orange">{formatCurrency(cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de asignaciones finalizadas */}
      {typedAssignments.some((a) => a.end_date) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Historial de Asignaciones</h3></div>
          <div className="divide-y divide-gray-50">
            {typedAssignments.filter((a) => a.end_date).map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-gray-700">{a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model} (${a.vehicle.plate})` : "—"}</p>
                <p className="text-xs text-gray-400">{formatDate(a.start_date)} → {a.end_date ? formatDate(a.end_date) : "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
