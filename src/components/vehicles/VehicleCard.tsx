import Link from "next/link";
import { Truck, Gauge, ChevronRight, UserCheck } from "lucide-react";
import { formatUsage } from "@/lib/utils";
import type { Vehicle } from "@/types";

const statusConfig = {
  activo: { label: "Activo", class: "bg-green-100 text-green-700" },
  en_mantencion: { label: "En Mantención", class: "bg-yellow-100 text-yellow-700" },
  fuera_de_servicio: { label: "Fuera de Servicio", class: "bg-red-100 text-red-700" },
};

const typeLabels: Record<string, string> = {
  camioneta: "Camioneta",
  camion: "Camión",
  maquinaria_pesada: "Maquinaria Pesada",
  furgon: "Furgón",
  otro: "Otro",
};

export default function VehicleCard({ vehicle, currentDriver }: { vehicle: Vehicle; currentDriver?: string }) {
  const status = statusConfig[vehicle.status];

  return (
    <Link
      href={`/dashboard/vehiculos/${vehicle.id}`}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            {vehicle.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vehicle.photo_url}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <Truck className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900">
              {vehicle.brand} {vehicle.model}
            </p>
            <p className="text-sm text-gray-500">{vehicle.year} — {vehicle.plate}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-construserv-orange transition mt-1" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Gauge className="w-4 h-4 text-gray-400" />
          {formatUsage(vehicle.current_km, vehicle.usage_unit)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{typeLabels[vehicle.type]}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.class}`}>
            {status.label}
          </span>
        </div>
      </div>
      {currentDriver && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
          <UserCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          <span className="text-xs text-gray-600 truncate">{currentDriver}</span>
        </div>
      )}
    </Link>
  );
}
