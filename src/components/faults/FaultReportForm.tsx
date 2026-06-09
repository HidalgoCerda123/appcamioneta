"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Camera, Loader2, X } from "lucide-react";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface Props {
  vehicles: Vehicle[];
  fixedVehicleId?: string;
  driverName?: string | null;
}

const SEVERITY = [
  { value: "baja", label: "Baja", help: "Puede esperar", class: "border-gray-300" },
  { value: "media", label: "Media", help: "Requiere atención pronto", class: "border-yellow-300" },
  { value: "alta", label: "Alta", help: "Urgente / no operar", class: "border-red-300" },
];

export default function FaultReportForm({ vehicles, fixedVehicleId, driverName }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [vehicleId, setVehicleId] = useState(fixedVehicleId ?? "");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("media");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 5));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!vehicleId) { setError("Selecciona el vehículo."); return; }
    if (!title.trim()) { setError("Describe brevemente la falla."); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Subir fotos
    const photoUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const name = `fallas/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: upErr } = await supabase.storage.from("maintenance-files").upload(name, file);
      if (!upErr && data) {
        const { data: urlData } = supabase.storage.from("maintenance-files").getPublicUrl(data.path);
        photoUrls.push(urlData.publicUrl);
      }
    }

    const { data: inserted, error: insErr } = await supabase
      .from("fault_reports")
      .insert({
        vehicle_id: vehicleId,
        reported_by: user?.id ?? null,
        driver_name: driverName ?? null,
        title: title.trim(),
        description: description.trim() || null,
        severity,
        photo_urls: photoUrls,
      })
      .select("id")
      .single();

    if (insErr) { setError(insErr.message); setSaving(false); return; }

    // Avisar a administradores (no bloquea si falla)
    try {
      await fetch("/api/faults/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fault_id: inserted.id }),
      });
    } catch { /* silencioso */ }

    router.push("/dashboard/fallas");
    router.refresh();
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        {!fixedVehicleId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo *</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputClass}>
              <option value="">Selecciona...</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué falla tiene? *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Ruido fuerte en el motor al acelerar" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gravedad</label>
          <div className="grid grid-cols-3 gap-2">
            {SEVERITY.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSeverity(s.value)}
                className={`rounded-lg border-2 py-2 px-2 text-center transition ${
                  severity === s.value ? `${s.class} bg-gray-50` : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className={`text-sm font-semibold ${
                  s.value === "alta" ? "text-red-600" : s.value === "media" ? "text-yellow-600" : "text-gray-600"
                }`}>{s.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.help}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Detalle (opcional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Cuenta lo que notaste, cuándo empezó, etc." className={`${inputClass} resize-none`} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fotos (opcional)</label>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-4 cursor-pointer hover:border-construserv-orange transition text-gray-500 text-sm">
            <Camera className="w-5 h-5" />
            Tomar o subir fotos
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          {saving ? "Enviando..." : "Reportar falla"}
        </button>
      </div>
    </form>
  );
}
