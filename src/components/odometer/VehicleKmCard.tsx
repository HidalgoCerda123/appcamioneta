"use client";

import { useState } from "react";
import { Gauge, Plus, TrendingUp, Clock } from "lucide-react";
import KmRegisterForm from "./KmRegisterForm";
import { daysSince } from "@/lib/date";

interface Reading {
  id: string;
  km: number;
  reading_date: string;
  source: string;
  driver_name: string | null;
}

interface Props {
  vehicleId: string;
  vehicleLabel: string;
  currentKm: number;
  readings: Reading[];
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Registro manual",
  maintenance: "Mantención",
  document: "Documento",
  initial: "Inicial",
};

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function VehicleKmCard({ vehicleId, vehicleLabel, currentKm, readings }: Props) {
  const [showForm, setShowForm] = useState(false);

  const lastReading = readings[0] ?? null;
  const daysSinceLast = lastReading ? daysSince(lastReading.reading_date) : null;

  // Promedio km/día entre la primera y última lectura
  let avgPerDay: number | null = null;
  if (readings.length >= 2) {
    const newest = readings[0];
    const oldest = readings[readings.length - 1];
    const kmDiff = newest.km - oldest.km;
    const dayDiff = Math.max(1, daysSince(oldest.reading_date) - daysSince(newest.reading_date));
    avgPerDay = Math.round(kmDiff / dayDiff);
  }

  const staleColor =
    daysSinceLast === null ? "text-gray-400" :
    daysSinceLast >= 7 ? "text-red-600" :
    daysSinceLast >= 3 ? "text-yellow-600" :
    "text-green-600";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-construserv-orange" />
          Kilometraje
        </h3>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-construserv-orange text-sm font-medium hover:underline"
        >
          <Plus className="w-4 h-4" />
          Registrar km
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Actual</p>
            <p className="font-bold text-gray-900 text-lg mt-0.5">{currentKm.toLocaleString("es-CL")}<span className="text-xs font-normal text-gray-400"> km</span></p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1"><Clock className="w-3 h-3" /> Última lectura</p>
            <p className={`font-semibold text-sm mt-0.5 ${staleColor}`}>
              {daysSinceLast === null ? "Sin registros" :
               daysSinceLast === 0 ? "Hoy" :
               daysSinceLast === 1 ? "Hace 1 día" :
               `Hace ${daysSinceLast} días`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Promedio</p>
            <p className="font-semibold text-gray-700 text-sm mt-0.5">
              {avgPerDay !== null ? `${avgPerDay.toLocaleString("es-CL")} km/día` : "—"}
            </p>
          </div>
        </div>

        {/* Formulario (toggle) */}
        {showForm && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <KmRegisterForm
              vehicleId={vehicleId}
              vehicleLabel={vehicleLabel}
              lastKm={currentKm}
              variant="card"
              onSuccess={() => setTimeout(() => setShowForm(false), 1500)}
            />
          </div>
        )}

        {/* Historial */}
        {readings.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Historial de lecturas</p>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {readings.slice(0, 20).map((r) => (
                <div key={r.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.km.toLocaleString("es-CL")} km</p>
                    <p className="text-xs text-gray-400">
                      {SOURCE_LABELS[r.source] ?? r.source}
                      {r.driver_name ? ` · ${r.driver_name}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">{fmtDate(r.reading_date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
