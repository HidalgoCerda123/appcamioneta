"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Loader2, CheckCircle } from "lucide-react";

interface Props {
  initialKm: number;
  initialHours: number;
}

export default function ServiceLeadSettings({ initialKm, initialHours }: Props) {
  const supabase = createClient();
  const [km, setKm] = useState(String(initialKm));
  const [hours, setHours] = useState(String(initialHours));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("app_settings")
      .update({
        km_service_lead: Number(km) || 0,
        hours_service_lead: Number(hours) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "global");
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Guardado");
    if (!error) setTimeout(() => setMsg(null), 2500);
  }

  const input = "w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anticipación en kilómetros</label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} value={km} onChange={(e) => setKm(e.target.value)} className={input} />
            <span className="text-sm text-gray-500">km antes</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Para vehículos medidos en kilómetros.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anticipación en horas</label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} className={input} />
            <span className="text-sm text-gray-500">horas antes</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Para maquinaria medida en horómetro.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-construserv-orange text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          {saving ? "Guardando..." : "Guardar margen"}
        </button>
        {msg && (
          <span className={`text-sm flex items-center gap-1 ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
            {!msg.startsWith("Error") && <CheckCircle className="w-4 h-4" />}
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
