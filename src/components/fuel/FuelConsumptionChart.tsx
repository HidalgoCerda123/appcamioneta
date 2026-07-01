"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
  return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }), order: d.getFullYear() * 12 + d.getMonth() };
}
function weekInfo(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return { key: monday.toISOString().slice(0, 10), label: monday.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }), order: monday.getTime() };
}

export default function FuelConsumptionChart({ loads, unit }: Props) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const isHoras = unit === "horas";
  const unitShort = isHoras ? "h" : "km";
  const effLabel = isHoras ? "L/hora" : "km/L";

  const data = useMemo(() => {
    const sorted = [...loads].filter((l) => l.liters).sort((a, b) => (a.fuel_date < b.fuel_date ? -1 : 1));

    // Tramos entre cargas (método del estanque)
    const rows = sorted.map((l, i) => {
      let dist = 0;
      let litersSeg = 0;
      const prev = sorted[i - 1];
      if (i > 0 && l.km_at_load != null && prev.km_at_load != null) {
        const d = l.km_at_load - prev.km_at_load;
        if (d > 0) { dist = d; litersSeg = Number(l.liters); }
      }
      return { ...l, dist, litersSeg };
    });

    const map = new Map<string, { label: string; order: number; litros: number; km: number; litersSeg: number }>();
    for (const l of rows) {
      const info = mode === "month" ? monthInfo(l.fuel_date) : weekInfo(l.fuel_date);
      const e = map.get(info.key) ?? { label: info.label, order: info.order, litros: 0, km: 0, litersSeg: 0 };
      e.litros += Number(l.liters);
      e.km += l.dist;
      e.litersSeg += l.litersSeg;
      map.set(info.key, e);
    }

    return [...map.values()].sort((a, b) => a.order - b.order).map((e) => ({
      periodo: e.label,
      litros: Math.round(e.litros * 100) / 100,
      km: e.km,
      rendimiento: e.km > 0 && e.litersSeg > 0
        ? Math.round((isHoras ? e.litersSeg / e.km : e.km / e.litersSeg) * 100) / 100
        : null,
    }));
  }, [loads, mode, isHoras]);

  const hasData = data.length > 0;
  const hasDistance = data.some((d) => d.km > 0);

  const axis = { fontSize: 11 };

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

      {!hasData ? (
        <p className="text-sm text-gray-400 text-center py-10">
          Aún no hay cargas de combustible para graficar.
        </p>
      ) : (
        <div className="p-5 space-y-6">
          {/* 1. Litros cargados */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">⛽ Litros cargados</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" tick={axis} />
                <YAxis tick={axis} width={40} tickFormatter={(v) => `${v}L`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString("es-CL")} L`, "Litros"]} />
                <Bar dataKey="litros" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Kilometraje recorrido entre cargas */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              🛣️ {isHoras ? "Horas trabajadas" : "Kilómetros recorridos"} entre cargas
            </p>
            {hasDistance ? (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={axis} />
                  <YAxis tick={axis} width={48} tickFormatter={(v) => `${v.toLocaleString("es-CL")}`} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString("es-CL")} ${unitShort}`, isHoras ? "Horas" : "Km"]} />
                  <Bar dataKey="km" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8 bg-gray-50 rounded-lg">
                Necesitas al menos 2 cargas con {isHoras ? "horómetro" : "kilometraje"} para medir el recorrido.
              </p>
            )}
          </div>

          {/* 3. Rendimiento */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">📈 Rendimiento ({effLabel})</p>
            {hasDistance ? (
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={axis} />
                  <YAxis tick={axis} width={40} />
                  <Tooltip formatter={(v: number) => [`${v} ${effLabel}`, "Rendimiento"]} />
                  <Line dataKey="rendimiento" stroke="#E8500A" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8 bg-gray-50 rounded-lg">
                El rendimiento se calcula con el {isHoras ? "horómetro" : "kilometraje"} entre 2 o más cargas.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
