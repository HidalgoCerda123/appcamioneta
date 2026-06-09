"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Gauge, Check, Loader2 } from "lucide-react";
import { todaySantiago } from "@/lib/date";
import { enqueue } from "@/lib/offlineQueue";

interface Props {
  vehicleId: string;
  vehicleLabel: string; // "Toyota Hilux — ABCD-12"
  lastKm: number | null;
  driverName?: string | null;
  unit?: "km" | "horas";
  /** "large" = pantalla obligatoria; "card" = tarjeta dentro de una página */
  variant?: "large" | "card";
  onSuccess?: () => void;
}

export default function KmRegisterForm({
  vehicleId,
  vehicleLabel,
  lastKm,
  driverName,
  unit = "km",
  variant = "card",
  onSuccess,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [km, setKm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isHoras = unit === "horas";
  const unitShort = isHoras ? "h" : "km";
  const unitWord = isHoras ? "horas" : "kilómetros";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = Number(km);
    if (!km || Number.isNaN(value) || value < 0) {
      setError(`Escribe un número de ${unitWord} válido.`);
      return;
    }
    if (lastKm !== null && value < lastKm) {
      setError(`No puede ser menor a la última lectura registrada (${lastKm.toLocaleString("es-CL")} ${unitShort}).`);
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const today = todaySantiago();
    const payload = {
      vehicle_id: vehicleId,
      km: value,
      reading_date: today,
      source: "manual",
      recorded_by: user?.id ?? null,
      driver_name: driverName ?? null,
    };

    // Sin conexión: guardar en cola y reintentar al recuperar señal
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueue({ action: "odometer", payload, dedupe: `odo-${vehicleId}-${today}` });
      setSaving(false);
      setDone(true);
      if (onSuccess) onSuccess();
      return;
    }

    const { error: insErr } = await supabase.from("odometer_readings").insert(payload);

    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }

    // Actualizar el kilometraje actual del vehículo si esta lectura es la más alta
    if (lastKm === null || value >= lastKm) {
      await supabase.from("vehicles").update({ current_km: value }).eq("id", vehicleId);
    }

    setSaving(false);
    setDone(true);
    if (onSuccess) onSuccess();
    router.refresh();
  }

  if (done) {
    return (
      <div className={variant === "large" ? "text-center py-8" : "text-center py-4"}>
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <p className="font-semibold text-gray-900 text-lg">
          ¡{isHoras ? "Horómetro" : "Kilometraje"} registrado!
        </p>
        <p className="text-gray-500 text-sm mt-1">Gracias. Ya puedes continuar.</p>
      </div>
    );
  }

  const isLarge = variant === "large";

  return (
    <form onSubmit={handleSubmit} className={isLarge ? "space-y-5" : "space-y-4"}>
      <div className="flex items-center gap-2 text-gray-700">
        <Gauge className={isLarge ? "w-6 h-6 text-construserv-orange" : "w-4 h-4 text-construserv-orange"} />
        <p className={isLarge ? "text-lg font-semibold" : "text-sm font-semibold"}>{vehicleLabel}</p>
      </div>

      <div>
        <label className={`block font-medium text-gray-700 mb-2 ${isLarge ? "text-lg" : "text-sm"}`}>
          {isHoras ? "¿Cuántas horas marca el horómetro hoy?" : "¿Cuántos kilómetros marca hoy?"}
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder={lastKm !== null ? lastKm.toLocaleString("es-CL") : "Ej: 125000"}
          autoFocus
          className={`w-full border-2 border-gray-300 rounded-xl text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-construserv-orange focus:border-construserv-orange ${
            isLarge ? "px-4 py-5 text-4xl" : "px-3 py-3 text-2xl"
          }`}
        />
        {lastKm !== null && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Última lectura: {lastKm.toLocaleString("es-CL")} {unitShort}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !km}
        className={`w-full bg-construserv-orange hover:bg-orange-600 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 ${
          isLarge ? "py-5 text-xl" : "py-3 text-base"
        }`}
      >
        {saving ? <Loader2 className={isLarge ? "w-6 h-6 animate-spin" : "w-5 h-5 animate-spin"} /> : <Check className={isLarge ? "w-6 h-6" : "w-5 h-5"} />}
        {saving ? "Guardando..." : `Guardar ${isHoras ? "horómetro" : "kilometraje"}`}
      </button>
    </form>
  );
}
