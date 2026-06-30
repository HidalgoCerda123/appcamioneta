"use client";

import { Bell, Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Profile } from "@/types";
import { useTheme } from "@/components/ui/ThemeProvider";

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

export default function Header({ profile, alertCount = 0 }: { profile: Profile | null; alertCount?: number }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const title =
    Object.entries(pageTitles)
      .reverse()
      .find(([key]) => pathname.startsWith(key))?.[1] ?? "Flotapp";

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
      {/* Mobile: logo + título de página */}
      <div className="md:hidden flex items-center gap-3">
        <img src="/logo-pares-alvarez.png" alt="Pares y Alvarez" className="h-8 w-auto object-contain" />
        <span className="font-semibold text-gray-800 dark:text-gray-100 text-base">{title}</span>
      </div>

      {/* Desktop: saludo */}
      <div className="hidden md:block">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
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
        <button
          onClick={toggle}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </button>
        <div className="w-9 h-9 rounded-full bg-construserv-orange flex items-center justify-center text-white text-sm font-bold">
          {profile?.full_name?.charAt(0).toUpperCase() ?? "U"}
        </div>
      </div>
    </header>
  );
}
