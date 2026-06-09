"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, X, Minus, Camera, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { todaySantiago } from "@/lib/date";

interface Props {
  vehicleId: string;
  vehicleLabel: string;
  driverName?: string | null;
}

const ITEMS = [
  { key: "luces", label: "Luces (delanteras, traseras, intermitentes)" },
  { key: "frenos", label: "Frenos" },
  { key: "neumaticos", label: "Neumáticos (estado y presión)" },
  { key: "niveles", label: "Niveles (aceite, refrigerante)" },
  { key: "fugas", label: "Fugas visibles (aceite, combustible, agua)" },
  { key: "espejos", label: "Espejos y vidrios" },
  { key: "cinturon", label: "Cinturón de seguridad" },
  { key: "bocina_alarma", label: "Bocina / alarma de retroceso" },
  { key: "extintor", label: "Extintor y botiquín" },
  { key: "limpieza", label: "Limpieza y orden de cabina" },
];

type ItemStatus = "ok" | "fail" | "na";

export default function InspectionForm({ vehicleId, vehicleLabel, driverName }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>(
    Object.fromEntries(ITEMS.map((i) => [i.key, "ok"]))
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [itemFiles, setItemFiles] = useState<Record<string, File[]>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { hasIssues: boolean }>(null);

  const hasIssues = Object.values(statuses).some((s) => s === "fail");

  function setStatus(key: string, value: ItemStatus) {
    setStatuses((prev) => ({ ...prev, [key]: value }));
  }
  function addFiles(key: string, list: FileList | null) {
    if (!list) return;
    setItemFiles((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...Array.from(list)].slice(0, 4) }));
  }
  function removeFile(key: string, idx: number) {
    setItemFiles((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((_, j) => j !== idx) }));
  }

  async function uploadFiles(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const name = `inspecciones/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: upErr } = await supabase.storage.from("maintenance-files").upload(name, file);
      if (!upErr && data) {
        const { data: urlData } = supabase.storage.from("maintenance-files").getPublicUrl(data.path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Subir fotos por cada ítem con falla y construir el detalle
    const items: { key: string; label: string; status: ItemStatus; note: string; photos: string[] }[] = [];
    const allPhotos: string[] = [];
    for (const i of ITEMS) {
      const st = statuses[i.key];
      let photos: string[] = [];
      if (st === "fail" && (itemFiles[i.key]?.length ?? 0) > 0) {
        photos = await uploadFiles(itemFiles[i.key]);
        allPhotos.push(...photos);
      }
      items.push({
        key: i.key,
        label: i.label,
        status: st,
        note: st === "fail" ? (notes[i.key] ?? "") : "",
        photos,
      });
    }

    const { error: insErr } = await supabase.from("inspections").insert({
      vehicle_id: vehicleId,
      profile_id: user?.id ?? null,
      driver_name: driverName ?? null,
      inspection_date: todaySantiago(),
      items,
      photo_urls: allPhotos,
      has_issues: hasIssues,
      notes: generalNotes.trim() || null,
    });

    setSaving(false);
    if (insErr) { setError(insErr.message); return; }
    setDone({ hasIssues });
    router.refresh();
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${done.hasIssues ? "bg-yellow-100" : "bg-green-100"}`}>
          {done.hasIssues ? <AlertTriangle className="w-8 h-8 text-yellow-600" /> : <CheckCircle className="w-8 h-8 text-green-600" />}
        </div>
        <p className="font-semibold text-gray-900 text-lg">Inspección registrada</p>
        {done.hasIssues ? (
          <>
            <p className="text-gray-500 text-sm mt-1">Marcaste fallas en la revisión. Te recomendamos reportarlas para que se gestionen.</p>
            <Link href="/dashboard/fallas/nueva" className="inline-block mt-4 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition">
              Reportar falla
            </Link>
          </>
        ) : (
          <p className="text-gray-500 text-sm mt-1">Todo en orden. ¡Buen viaje!</p>
        )}
      </div>
    );
  }

  const STATUS_BTN: { value: ItemStatus; label: string; icon: typeof Check; on: string }[] = [
    { value: "ok", label: "Bien", icon: Check, on: "bg-green-500 text-white border-green-500" },
    { value: "fail", label: "Falla", icon: X, on: "bg-red-500 text-white border-red-500" },
    { value: "na", label: "N/A", icon: Minus, on: "bg-gray-400 text-white border-gray-400" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {ITEMS.map((item) => {
          const failed = statuses[item.key] === "fail";
          const files = itemFiles[item.key] ?? [];
          return (
            <div key={item.key} className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-gray-800 flex-1 min-w-[140px]">{item.label}</p>
                <div className="flex gap-1.5">
                  {STATUS_BTN.map((b) => {
                    const active = statuses[item.key] === b.value;
                    return (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => setStatus(item.key, b.value)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          active ? b.on : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <b.icon className="w-3.5 h-3.5" />
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalle específico de ESTA falla: descripción + fotos propias */}
              {failed && (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-red-700 mb-1">¿Qué problema tiene? (describe esta falla)</label>
                    <input
                      value={notes[item.key] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [item.key]: e.target.value }))}
                      placeholder="Ej: neumático trasero derecho desinflado"
                      className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                  <div>
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-red-200 rounded-lg py-2.5 cursor-pointer hover:border-red-300 transition text-red-600 text-sm">
                      <Camera className="w-4 h-4" /> Foto de esta falla
                      <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addFiles(item.key, e.target.files)} />
                    </label>
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {files.map((f, i) => (
                          <div key={i} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={URL.createObjectURL(f)} alt="" className="w-14 h-14 object-cover rounded-lg border border-red-200" />
                            <button type="button" onClick={() => removeFile(item.key, i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Comentario general (opcional)</label>
        <textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} rows={2} placeholder="Algo adicional que quieras dejar registrado" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange resize-none" />
      </div>

      <button type="submit" disabled={saving} className={`w-full py-3.5 rounded-xl font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${hasIssues ? "bg-yellow-600 hover:bg-yellow-700" : "bg-construserv-orange hover:bg-orange-600"}`}>
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
        {saving ? "Guardando..." : "Finalizar inspección"}
      </button>
    </form>
  );
}
