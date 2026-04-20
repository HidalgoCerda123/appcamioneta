"use client";

import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Profile } from "@/types";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/vehiculos": "Vehículos",
  "/dashboard/conductores": "Conductores",
  "/dashboard/mantenciones": "Mantenciones",
  "/dashboard/documentos": "Documentos",
  "/dashboard/notificaciones": "Notificaciones",
  "/dashboard/reportes": "Reportes",
  "/dashboard/usuarios": "Usuarios",
  "/dashboard/configuracion": "Configuración",
};

export default function Header({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();

  const title =
    Object.entries(pageTitles)
      .reverse()
      .find(([key]) => pathname.startsWith(key))?.[1] ?? "ConstruservAPP";

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
      {/* Mobile: logo + título de página */}
      <div className="md:hidden flex items-center gap-3">
        <img src="/Logo construserv.jpg" alt="Construserv" className="h-8 w-auto object-contain" />
        <span className="font-semibold text-gray-800 text-base">{title}</span>
      </div>

      {/* Desktop: saludo */}
      <div className="hidden md:block">
        <h1 className="text-lg font-semibold text-gray-800">
          Bienvenido, {profile?.full_name?.split(" ")[0] ?? "Usuario"}
        </h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString("es-CL", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-9 h-9 rounded-full bg-construserv-orange flex items-center justify-center text-white text-sm font-bold">
          {profile?.full_name?.charAt(0).toUpperCase() ?? "U"}
        </div>
      </div>
    </header>
  );
}
