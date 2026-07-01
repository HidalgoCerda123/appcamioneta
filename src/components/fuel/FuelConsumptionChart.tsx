"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Fuel } from "lucide-react";

interface Load {
  fuel_date: string;
  liters: number;
  total_cost: number;
  km_at_load: number | null;
}

interface Props {
  loads: Load[];
  unit: "km" | "horas";
}

function monthInfo(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const y = d.getFullYear();
  const m = d.getMonth();
  const label = d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
  return { key: `${y}-${m}`, label, order: y * 12 + m };
}

function weekInfo(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  // lunes de esa semana
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  const label = monday.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
  return { key: monday.toISOString().slice(0, 10), label, order: monday.getTime() };
}

export default function FuelConsumptionChart({ loads, unit }: Props) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const isHoras = unit === "horas";
  const effLabel = isHoras ? "L/hora" : "km/L";

  const data = useMemo(() => {
    const sorted = [...loads]
      .filter((l) => l.liters)
      .sort((a, b) => (a.fuel_date < b.fuel_date ? -1 : 1));

    // Distancia entre cargas (método de estanque lleno)
    const withDist = sorted.map((l, i) => {
      let dist = 0;
      const prev = sorted[i - 1];
      if (i > 0 && l.km_at_load != null && prev.km_at_load != null) {
        const d = l.km_at_load - prev.km_at_load;
        if (d > 0) dist = d;
      }
      return { ...l, dist };
    });

    const map = new Map<string, { label: string; order: number; litros: number; costo: number; dist: number }>();
    for (const l of withDist) {
      const info = mode === "month" ? monthInfo(l.fuel_date) : weekInfo(l.fuel_date);
      const e = map.get(info.key) ?? { label: info.label, order: info.order, litros: 0, costo: 0, dist: 0 };
      e.litros += Number(l.liters);
      e.costo += l.total_cost ?? 0;
      e.dist += l.dist;
      map.set(info.key, e);
    }

    return [...map.values()]
      .sort((a, b) => a.order - b.order)
      .map((e) => ({
        periodo: e.label,
        litros: Math.round(e.litros * 100) / 100,
        costo: e.costo,
        rendimiento: e.dist > 0 && e.litros > 0
          ? Math.round((isHoras ? e.litros / e.dist : e.dist / e.litros) * 100) / 100
          : null,
      }));
  }, [loads, mode, isHoras]);

  const hasData = data.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Fuel className="w-4 h-4 text-construserv-orange" />
          Consumo de Combustible
        </h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["month", "week"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                mode === m ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "month" ? "Por mes" : "Por semana"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {!hasData ? (
          <p className="text-sm text-gray-400 text-center py-10">
            Aún no hay cargas de combustible para graficar. Registra cargas con su kilometraje.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={38} tickFormatter={(v) => `${v}L`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={44} tickFormatter={(v) => `${v}`} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "litros") return [`${value.toLocaleString("es-CL")} L`, "Litros"];
                  if (name === "rendimiento") return [`${value} ${effLabel}`, "Rendimiento"];
                  return [`$${value.toLocaleString("es-CL")}`, "Costo"];
                }}
              />
              <Legend
                iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11 }}
                formatter={(v) => (v === "litros" ? "Litros cargados" : `Rendimiento (${effLabel})`)}
              />
              <Bar yAxisId="left" dataKey="litros" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" dataKey="rendimiento" stroke="#E8500A" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Barras: litros cargados por período. Línea: rendimiento ({effLabel}) calculado con el {isHoras ? "horómetro" : "kilometraje"} entre cargas.
        </p>
      </div>
    </div>
  );
}
