"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Fuel, Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  current_km?: number;
  usage_unit?: "km" | "horas";
}

interface FuelLoad {
  id: string;
  vehicle_id: string;
  fuel_date: string;
  liters: number;
  total_cost: number;
  km_at_load?: number | null;
  station?: string | null;
  notes?: string | null;
}

interface Props {
  vehicles: Vehicle[];
  defaultVehicleId?: string;
  driverName?: string | null;
  fuelLoad?: FuelLoad;
}

export default function FuelLoadForm({ vehicles, defaultVehicleId, driverName, fuelLoad }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!fuelLoad;
  const [vehicleId, setVehicleId] = useState(fuelLoad?.vehicle_id ?? defaultVehicleId ?? "");
  const [form, setForm] = useState({
    fuel_date: fuelLoad?.fuel_date ?? new Date().toISOString().split("T")[0],
    liters: fuelLoad ? String(fuelLoad.liters) : "",
    total_cost: fuelLoad ? String(fuelLoad.total_cost) : "",
    km_at_load: fuelLoad?.km_at_load != null ? String(fuelLoad.km_at_load) : "",
    station: fuelLoad?.station ?? "",
    notes: fuelLoad?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const unit = selectedVehicle?.usage_unit ?? "km";
  const unitShort = unit === "horas" ? "h" : "km";

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!vehicleId) { setError("Selecciona el vehículo."); return; }
    if (!form.liters || Number(form.liters) <= 0) { setError("Ingresa los litros cargados."); return; }

    const km = form.km_at_load ? Number(form.km_at_load) : null;
    // Solo validar km bajo al crear (al editar se permite corregir hacia abajo)
    if (!isEditing && km !== null && selectedVehicle?.current_km != null && km < selectedVehicle.current_km) {
      setError(`El ${unitShort} ingresado (${km.toLocaleString("es-CL")}) es menor al registrado en el vehículo (${selectedVehicle.current_km.toLocaleString("es-CL")} ${unitShort}). Verifica el valor.`);
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      vehicle_id: vehicleId,
      fuel_date: form.fuel_date,
      liters: Number(form.liters),
      total_cost: form.total_cost ? Number(form.total_cost) : 0,
      km_at_load: km,
      station: form.station.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (isEditing) {
      const { error: updErr } = await supabase.from("fuel_loads").update(payload).eq("id", fuelLoad.id);
      if (updErr) { setError(updErr.message); setSaving(false); return; }

      // Sincronizar la lectura de odómetro vinculada a esta carga
      const { data: linked } = await supabase.from("odometer_readings").select("id").eq("fuel_load_id", fuelLoad.id).maybeSingle();
      if (km !== null) {
        if (linked) {
          await supabase.from("odometer_readings").update({ vehicle_id: vehicleId, km, reading_date: form.fuel_date }).eq("id", linked.id);
        } else {
          await supabase.from("odometer_readings").insert({
            vehicle_id: vehicleId, km, reading_date: form.fuel_date, source: "fuel",
            fuel_load_id: fuelLoad.id, recorded_by: user?.id ?? null,
          });
        }
        // Subir el km actual del vehículo si corresponde
        const { data: veh } = await supabase.from("vehicles").select("current_km").eq("id", vehicleId).single();
        if (veh && km >= veh.current_km) await supabase.from("vehicles").update({ current_km: km }).eq("id", vehicleId);
      } else if (linked) {
        // Se quitó el km: eliminar la lectura vinculada
        await supabase.from("odometer_readings").delete().eq("id", linked.id);
      }

      router.push("/dashboard/combustible");
      router.refresh();
      return;
    }

    const { data: inserted, error: insErr } = await supabase.from("fuel_loads").insert({
      ...payload,
      driver_name: driverName ?? null,
      recorded_by: user?.id ?? null,
    }).select("id").single();

    if (insErr) { setError(insErr.message); setSaving(false); return; }

    // Registrar lectura de odómetro vinculada y actualizar km del vehículo (solo al crear)
    if (km !== null) {
      await supabase.from("odometer_readings").insert({
        vehicle_id: vehicleId,
        km,
        reading_date: form.fuel_date,
        source: "fuel",
        fuel_load_id: inserted?.id ?? null,
        recorded_by: user?.id ?? null,
        driver_name: driverName ?? null,
      });
      if (selectedVehicle?.current_km == null || km >= selectedVehicle.current_km) {
        await supabase.from("vehicles").update({ current_km: km }).eq("id", vehicleId);
      }
    }

    router.push("/dashboard/combustible");
    router.refresh();
  }

  const input = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange";
  const label = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={label}>Vehículo *</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={input}>
            <option value="">Selecciona un vehículo...</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Fecha *</label>
          <input type="date" value={form.fuel_date} onChange={(e) => set("fuel_date", e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>{unit === "horas" ? "Horómetro al cargar" : "Kilometraje al cargar"}</label>
          <input type="number" min={0} value={form.km_at_load} onChange={(e) => set("km_at_load", e.target.value)} placeholder={`Marca del ${unit === "horas" ? "horómetro" : "odómetro"}`} className={input} />
        </div>
        <div>
          <label className={label}>Litros *</label>
          <input type="number" step="0.01" min={0} value={form.liters} onChange={(e) => set("liters", e.target.value)} placeholder="Ej: 45.5" className={input} />
        </div>
        <div>
          <label className={label}>Monto total (CLP)</label>
          <input type="number" min={0} value={form.total_cost} onChange={(e) => set("total_cost", e.target.value)} placeholder="Ej: 38000" className={input} />
        </div>
        <div>
          <label className={label}>Estación / Surtidor</label>
          <input value={form.station} onChange={(e) => set("station", e.target.value)} placeholder="Ej: Copec Ruta 68" className={input} />
        </div>
        <div>
          <label className={label}>Notas</label>
          <input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Opcional" className={input} />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancelar</button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-construserv-orange rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fuel className="w-4 h-4" />}
          {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Registrar carga"}
        </button>
      </div>
    </form>
  );
}
