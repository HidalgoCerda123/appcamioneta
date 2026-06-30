import { addDays, daysUntilDate } from "./date";

// Margen de anticipación para avisar una mantención por kilometraje/horas
export const KM_SERVICE_LEAD = { km: 200, horas: 20 } as const;

export interface KmServiceStatus {
  due: boolean;      // dentro del margen de aviso o ya pasado
  overdue: boolean;  // ya se alcanzó/superó el km objetivo
  remaining: number; // km/horas que faltan (negativo = pasado)
  lead: number;
}

/** Estado de una mantención programada por km objetivo (next_service_km). */
export function kmServiceStatus(nextKm: number, currentValue: number, unit: "km" | "horas"): KmServiceStatus {
  const lead = unit === "horas" ? KM_SERVICE_LEAD.horas : KM_SERVICE_LEAD.km;
  const remaining = nextKm - currentValue;
  return { due: remaining <= lead, overdue: remaining <= 0, remaining, lead };
}

export interface MaintenancePlan {
  id: string;
  vehicle_id: string;
  type: string;
  interval_value: number | null;
  interval_days: number | null;
  active: boolean;
}

export interface LastService {
  km_at_service: number;
  date: string; // "YYYY-MM-DD"
}

export type PlanLevel = "ok" | "soon" | "overdue" | "unknown";

export interface PlanStatus {
  level: PlanLevel;
  hasBaseline: boolean;
  remainingValue: number | null; // km/horas hasta el próximo servicio (negativo = pasado)
  nextDueValue: number | null;
  daysLeft: number | null; // días hasta el próximo servicio (negativo = pasado)
  nextDueDate: string | null;
}

/** Umbral de "próximo" en km/horas según la unidad y el intervalo. */
function warnThreshold(intervalValue: number, unit: "km" | "horas"): number {
  const base = unit === "horas" ? 20 : 500;
  return Math.max(Math.round(intervalValue * 0.1), base);
}

/**
 * Calcula el estado de un plan de mantención preventiva.
 * currentValue = km u horas actuales del vehículo.
 */
export function computePlanStatus(
  plan: MaintenancePlan,
  last: LastService | null,
  currentValue: number,
  unit: "km" | "horas"
): PlanStatus {
  if (!last) {
    return { level: "unknown", hasBaseline: false, remainingValue: null, nextDueValue: null, daysLeft: null, nextDueDate: null };
  }

  let remainingValue: number | null = null;
  let nextDueValue: number | null = null;
  let valueLevel: PlanLevel | null = null;
  if (plan.interval_value && plan.interval_value > 0) {
    nextDueValue = last.km_at_service + plan.interval_value;
    remainingValue = nextDueValue - currentValue;
    const warn = warnThreshold(plan.interval_value, unit);
    valueLevel = remainingValue <= 0 ? "overdue" : remainingValue <= warn ? "soon" : "ok";
  }

  let daysLeft: number | null = null;
  let nextDueDate: string | null = null;
  let dateLevel: PlanLevel | null = null;
  if (plan.interval_days && plan.interval_days > 0) {
    nextDueDate = addDays(last.date, plan.interval_days);
    daysLeft = daysUntilDate(nextDueDate);
    dateLevel = daysLeft <= 0 ? "overdue" : daysLeft <= 15 ? "soon" : "ok";
  }

  // El nivel final es el más urgente entre km/horas y días
  const order: Record<PlanLevel, number> = { overdue: 3, soon: 2, ok: 1, unknown: 0 };
  const levels = [valueLevel, dateLevel].filter(Boolean) as PlanLevel[];
  const level = levels.length > 0 ? levels.reduce((a, b) => (order[b] > order[a] ? b : a)) : "unknown";

  return { level, hasBaseline: true, remainingValue, nextDueValue, daysLeft, nextDueDate };
}
