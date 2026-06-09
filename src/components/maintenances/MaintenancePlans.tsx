"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarClock, Plus, Trash2, Loader2 } from "lucide-react";
import { computePlanStatus, type MaintenancePlan, type LastService, type PlanLevel } from "@/lib/maintenance";

interface Props {
  vehicleId: string;
  unit: "km" | "horas";
  currentValue: number;
  plans: MaintenancePlan[];
  lastByType: Record<string, LastService>;
  canEdit: boolean;
}

const TYPE_OPTIONS = [
  { value: "aceite", label: "Cambio de Aceite" },
  { value: "frenos", label: "Frenos" },
  { value: "neumaticos", label: "Neumáticos" },
  { value: "filtros", label: "Filtros" },
  { value: "suspension", label: "Suspensión" },
  { value: "electrico", label: "Eléctrico" },
  { value: "general", label: "Mantención General" },
  { value: "otro", label: "Otro" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label]));

const LEVEL_BADGE: Record<PlanLevel, { text: string; class: string }> = {
  overdue: { text: "Vencida", class: "bg-red-100 text-red-700" },
  soon: { text: "Próxima", class: "bg-yellow-100 text-yellow-700" },
  ok: { text: "Al día", class: "bg-green-100 text-green-700" },
  unknown: { text: "Sin base", class: "bg-gray-100 text-gray-500" },
};

export default function MaintenancePlans({ vehicleId, unit, currentValue, plans: initialPlans, lastByType, canEdit }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [plans, setPlans] = useState<MaintenancePlan[]>(initialPlans);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ type: "aceite", interval_value: "", interval_days: "" });

  const unitShort = unit === "horas" ? "h" : "km";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.interval_value && !form.interval_days) {
      setError("Define al menos un intervalo (km/horas o días).");
      return;
    }
    setSaving(true);
    const { data, error: insErr } = await supabase
      .from("maintenance_plans")
      .insert({
        vehicle_id: vehicleId,
        type: form.type,
        interval_value: form.interval_value ? Number(form.interval_value) : null,
        interval_days: form.interval_days ? Number(form.interval_days) : null,
      })
      .select()
      .single();
    setSaving(false);
    if (insErr) { setError(insErr.message); return; }
    setPlans((p) => [...p, data as MaintenancePlan]);
    setForm({ type: "aceite", interval_value: "", interval_days: "" });
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setPlans((p) => p.filter((x) => x.id !== id));
    await supabase.from("maintenance_plans").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-construserv-orange" />
          Mantención Preventiva
        </h3>
        {canEdit && (
          <button
            onClick={() => setAdding((a) => !a)}
            className="flex items-center gap-1.5 text-construserv-orange text-sm font-medium hover:underline"
          >
            <Plus className="w-4 h-4" />
            Agregar plan
          </button>
        )}
      </div>

      <div className="p-5 space-y-3">
        {adding && canEdit && (
          <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
                >
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cada ({unitShort})</label>
                <input
                  type="number" min={0} value={form.interval_value}
                  onChange={(e) => setForm((f) => ({ ...f, interval_value: e.target.value }))}
                  placeholder={unit === "horas" ? "Ej: 250" : "Ej: 10000"}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">o cada (días)</label>
                <input
                  type="number" min={0} value={form.interval_days}
                  onChange={(e) => setForm((f) => ({ ...f, interval_days: e.target.value }))}
                  placeholder="Ej: 180"
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 bg-construserv-orange text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Guardar
              </button>
              <button type="button" onClick={() => { setAdding(false); setError(null); }} className="px-4 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {plans.length === 0 && !adding && (
          <p className="text-sm text-gray-400 text-center py-3">
            Sin planes preventivos. {canEdit ? "Agrega uno para que la app avise cuándo toca cada servicio." : ""}
          </p>
        )}

        {plans.map((plan) => {
          const status = computePlanStatus(plan, lastByType[plan.type] ?? null, currentValue, unit);
          const badge = LEVEL_BADGE[status.level];
          let detail = "";
          if (!status.hasBaseline) {
            detail = "Registra la primera mantención de este tipo para activar el seguimiento.";
          } else {
            const parts: string[] = [];
            if (status.remainingValue !== null) {
              parts.push(status.remainingValue <= 0
                ? `Vencida por ${Math.abs(status.remainingValue).toLocaleString("es-CL")} ${unitShort}`
                : `Faltan ${status.remainingValue.toLocaleString("es-CL")} ${unitShort}`);
            }
            if (status.daysLeft !== null) {
              parts.push(status.daysLeft <= 0
                ? `vencida hace ${Math.abs(status.daysLeft)} días`
                : `${status.daysLeft} días`);
            }
            detail = parts.join(" · ");
          }

          const intervalText = [
            plan.interval_value ? `cada ${plan.interval_value.toLocaleString("es-CL")} ${unitShort}` : null,
            plan.interval_days ? `cada ${plan.interval_days} días` : null,
          ].filter(Boolean).join(" o ");

          return (
            <div key={plan.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {TYPE_LABELS[plan.type] ?? plan.type}
                  <span className="text-xs font-normal text-gray-400"> — {intervalText}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.class}`}>{badge.text}</span>
                {canEdit && (
                  <button onClick={() => handleDelete(plan.id)} className="text-gray-300 hover:text-red-500 transition" title="Eliminar plan">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
