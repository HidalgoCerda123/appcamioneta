export interface FuelLoadPoint {
  fuel_date: string;
  liters: number;
  total_cost: number;
  km_at_load: number | null;
}

export interface FuelStats {
  loads: number;
  totalLiters: number;
  totalCost: number;
  /** Distancia (km) u horas medidas entre cargas consecutivas con lectura. */
  distance: number;
  /** Rendimiento: km/L (o L/hora). null si no hay distancia medida. */
  efficiency: number | null;
  efficiencyLabel: string;
  /** Costo de combustible por km (o por hora). null si no hay distancia medida. */
  costPerUnit: number | null;
}

/**
 * Método canónico de cálculo de combustible (método del estanque).
 * El rendimiento y el costo por km se calculan con la distancia RECORRIDA ENTRE
 * cargas y los litros/costo de la carga que cierra cada tramo (se excluye la
 * primera carga, que no tiene tramo previo). Se usa igual en ficha, combustible,
 * reportes y gráficos para que todo sea consistente.
 */
export function computeFuelStats(loadsRaw: FuelLoadPoint[], unit: "km" | "horas"): FuelStats | null {
  const loads = loadsRaw
    .filter((l) => l.liters)
    .sort((a, b) => (a.fuel_date < b.fuel_date ? -1 : a.fuel_date > b.fuel_date ? 1 : 0));
  if (loads.length === 0) return null;

  const totalLiters = loads.reduce((s, l) => s + Number(l.liters), 0);
  const totalCost = loads.reduce((s, l) => s + (l.total_cost ?? 0), 0);

  let distance = 0;
  let litersSeg = 0;
  let costSeg = 0;
  for (let i = 1; i < loads.length; i++) {
    const prev = loads[i - 1];
    const cur = loads[i];
    if (cur.km_at_load != null && prev.km_at_load != null) {
      const d = cur.km_at_load - prev.km_at_load;
      if (d > 0) {
        distance += d;
        litersSeg += Number(cur.liters);
        costSeg += cur.total_cost ?? 0;
      }
    }
  }

  const efficiency = distance > 0 && litersSeg > 0
    ? Math.round((unit === "horas" ? litersSeg / distance : distance / litersSeg) * 100) / 100
    : null;
  const costPerUnit = distance > 0 ? Math.round(costSeg / distance) : null;

  return {
    loads: loads.length,
    totalLiters: Math.round(totalLiters * 100) / 100,
    totalCost,
    distance,
    efficiency,
    efficiencyLabel: unit === "horas" ? "L/hora" : "km/L",
    costPerUnit,
  };
}
