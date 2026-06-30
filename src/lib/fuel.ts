export interface FuelSummary {
  vehicle_id: string;
  loads: number;
  total_liters: number | null;
  total_cost: number | null;
  min_km: number | null;
  max_km: number | null;
}

export interface FuelMetrics {
  span: number; // km u horas recorridos en el período con datos de combustible
  liters: number;
  cost: number;
  /** Costo de combustible por km (o por hora). null si no hay recorrido suficiente. */
  costPerUnit: number | null;
  /** Rendimiento: km/L para km, L/hora para horas. */
  efficiency: number | null;
  efficiencyLabel: string;
}

/** Calcula métricas de combustible desde el resumen del vehículo. */
export function fuelMetrics(s: FuelSummary | null | undefined, unit: "km" | "horas"): FuelMetrics | null {
  if (!s) return null;
  const span = (s.max_km ?? 0) - (s.min_km ?? 0);
  const liters = Number(s.total_liters ?? 0);
  const cost = Number(s.total_cost ?? 0);
  const costPerUnit = span > 0 ? Math.round(cost / span) : null;

  let efficiency: number | null = null;
  let efficiencyLabel = "";
  if (unit === "horas") {
    efficiency = span > 0 ? Math.round((liters / span) * 100) / 100 : null;
    efficiencyLabel = "L/hora";
  } else {
    efficiency = liters > 0 ? Math.round((span / liters) * 100) / 100 : null;
    efficiencyLabel = "km/L";
  }
  return { span, liters, cost, costPerUnit, efficiency, efficiencyLabel };
}
