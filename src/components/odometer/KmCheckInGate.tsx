"use client";

import { useState } from "react";
import KmRegisterForm from "./KmRegisterForm";
import { Gauge } from "lucide-react";

interface Props {
  vehicleId: string;
  vehicleLabel: string;
  lastKm: number | null;
  driverName?: string | null;
}

/**
 * Pantalla obligatoria: si el conductor no ha registrado el km de hoy,
 * se muestra un overlay que bloquea la app hasta que lo ingrese.
 */
export default function KmCheckInGate({ vehicleId, vehicleLabel, lastKm, driverName }: Props) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
            <Gauge className="w-7 h-7 text-construserv-orange" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Registra el kilometraje de hoy</h2>
          <p className="text-gray-500 text-sm mt-1">
            Antes de continuar, anota cuántos kilómetros marca tu vehículo. Solo toma unos segundos.
          </p>
        </div>

        <KmRegisterForm
          vehicleId={vehicleId}
          vehicleLabel={vehicleLabel}
          lastKm={lastKm}
          driverName={driverName}
          variant="large"
          onSuccess={() => setTimeout(() => setOpen(false), 1500)}
        />
      </div>
    </div>
  );
}
