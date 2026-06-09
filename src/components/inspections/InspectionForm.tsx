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
  const [generalNotes, setGeneralNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { hasIssues: boolean }>(null);

  const hasIssues = Object.values(statuses).some((s) => s === "fail");

  function setStatus(key: string, value: ItemStatus) {
    setStatuses((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const photoUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const name = `inspecciones/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: upErr } = await supabase.storage.from("maintenance-files").upload(name, file);
      if (!upErr && data) {
        const { data: urlData } = supabase.storage.from("maintenance-files").getPublicUrl(data.path);
        photoUrls.push(urlData.publicUrl);
      }
    }

    const items = ITEMS.map((i) => ({
      key: i.key,
      label: i.label,
      status: statuses[i.key],
      note: statuses[i.key] === "fail" ? (notes[i.key] ?? "") : "",
    }));

    const { error: insErr } = await supabase.from("inspections").insert({
      vehicle_id: vehicleId,
      profile_id: user?.id ?? null,
      driver_name: driverName ?? null,
      inspection_date: todaySantiago(),
      items,
      photo_urls: photoUrls,
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
        {ITEMS.map((item) => (
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
            {statuses[item.key] === "fail" && (
              <input
                value={notes[item.key] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [item.key]: e.target.value }))}
                placeholder="¿Qué problema tiene? (opcional)"
                className="w-full mt-2 border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
          <textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fotos (opcional)</label>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-3 cursor-pointer hover:border-construserv-orange transition text-gray-500 text-sm">
            <Camera className="w-5 h-5" /> Tomar o subir fotos
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => e.target.files && setFiles((p) => [...p, ...Array.from(e.target.files!)].slice(0, 5))} />
          </label>
          {files.length > 0 && <p className="text-xs text-gray-400 mt-2">{files.length} foto(s) adjunta(s)</p>}
        </div>
      </div>

      <button type="submit" disabled={saving} className={`w-full py-3.5 rounded-xl font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${hasIssues ? "bg-yellow-600 hover:bg-yellow-700" : "bg-construserv-orange hover:bg-orange-600"}`}>
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
        {saving ? "Guardando..." : "Finalizar inspección"}
      </button>
    </form>
  );
}
