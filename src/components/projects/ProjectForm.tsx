"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  client?: string | null;
  location?: string | null;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

export default function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!project;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: project?.name ?? "",
    client: project?.client ?? "",
    location: project?.location ?? "",
    status: project?.status ?? "activa",
    start_date: project?.start_date ?? new Date().toISOString().split("T")[0],
    end_date: project?.end_date ?? "",
    notes: project?.notes ?? "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("El nombre de la obra es obligatorio."); return; }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      client: form.client.trim() || null,
      location: form.location.trim() || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes.trim() || null,
    };

    if (isEditing) {
      const { error: e2 } = await supabase.from("projects").update(payload).eq("id", project.id);
      if (e2) { setError(e2.message); setSaving(false); return; }
      router.push(`/dashboard/obras/${project.id}`);
    } else {
      const { data, error: e2 } = await supabase.from("projects").insert(payload).select("id").single();
      if (e2) { setError(e2.message); setSaving(false); return; }
      router.push(`/dashboard/obras/${data.id}`);
    }
    router.refresh();
  }

  const input = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange";
  const label = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={label}>Nombre de la obra *</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Edificio El Trintre - Etapa 2" className={input} />
        </div>
        <div>
          <label className={label}>Cliente / Mandante</label>
          <input value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="Ej: Constructora XYZ" className={input} />
        </div>
        <div>
          <label className={label}>Ubicación</label>
          <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ej: Camino a Melipilla km 12" className={input} />
        </div>
        <div>
          <label className={label}>Estado</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={input}>
            <option value="activa">Activa</option>
            <option value="finalizada">Finalizada</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Inicio</label>
            <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Término</label>
            <input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} className={input} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Notas</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${input} resize-none`} />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancelar</button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-construserv-orange rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isEditing ? "Guardar cambios" : "Crear obra"}
        </button>
      </div>
    </form>
  );
}
