"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Truck, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Vehicle { id: string; plate: string; brand: string; model: string }
interface Assignment {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string | null;
  vehicle: Vehicle | null;
}

interface Props {
  projectId: string;
  vehicles: Vehicle[];
  assignments: Assignment[];
  canEdit: boolean;
}

export default function ProjectVehicleControl({ projectId, vehicles, assignments, canEdit }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [busy, setBusy] = useState(false);

  const activeAssignments = assignments.filter((a) => !a.end_date);
  const activeVehicleIds = new Set(activeAssignments.map((a) => a.vehicle_id));
  const available = vehicles.filter((v) => !activeVehicleIds.has(v.id));

  async function assign() {
    if (!vehicleId) return;
    setBusy(true);
    await supabase.from("project_vehicles").insert({
      project_id: projectId,
      vehicle_id: vehicleId,
      start_date: new Date().toISOString().split("T")[0],
    });
    setBusy(false);
    setVehicleId("");
    setAdding(false);
    router.refresh();
  }

  async function endAssignment(id: string) {
    setBusy(true);
    await supabase.from("project_vehicles").update({ end_date: new Date().toISOString().split("T")[0] }).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Truck className="w-4 h-4 text-construserv-orange" />
          Vehículos en la Obra
        </h3>
        {canEdit && available.length > 0 && (
          <button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1.5 text-construserv-orange text-sm font-medium hover:underline">
            <Plus className="w-4 h-4" /> Asignar
          </button>
        )}
      </div>

      <div className="p-5 space-y-3">
        {adding && canEdit && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehículo</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange">
                <option value="">Selecciona...</option>
                {available.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>)}
              </select>
            </div>
            <button onClick={assign} disabled={busy || !vehicleId} className="flex items-center gap-1.5 bg-construserv-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Asignar
            </button>
          </div>
        )}

        {activeAssignments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">Sin vehículos asignados actualmente.</p>
        ) : (
          activeAssignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model} (${a.vehicle.plate})` : "—"}
                </p>
                <p className="text-xs text-gray-400">Desde {formatDate(a.start_date)}</p>
              </div>
              {canEdit && (
                <button onClick={() => endAssignment(a.id)} disabled={busy} className="text-xs font-medium text-gray-500 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition disabled:opacity-50">
                  Finalizar
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
