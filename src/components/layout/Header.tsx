"use client";

import { Bell, Sun, Moon, FileText, UserCheck, Wrench, CheckCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
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

interface AlertBreakdown {
  docs: number;
  licenses: number;
  maintenances: number;
}

export default function Header({
  profile,
  alertCount = 0,
  alerts = { docs: 0, licenses: 0, maintenances: 0 },
}: {
  profile: Profile | null;
  alertCount?: number;
  alerts?: AlertBreakdown;
}) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const title =
    Object.entries(pageTitles)
      .reverse()
      .find(([key]) => pathname.startsWith(key))?.[1] ?? "Flotapp";

  const items = [
    { label: "Documentos por vencer", count: alerts.docs, icon: FileText, color: "text-blue-500", href: "/dashboard/documentos?estado=proximo" },
    { label: "Licencias por vencer", count: alerts.licenses, icon: UserCheck, color: "text-purple-500", href: "/dashboard/conductores" },
    { label: "Mantenciones próximas", count: alerts.maintenances, icon: Wrench, color: "text-construserv-orange", href: "/dashboard/mantenciones" },
  ].filter((i) => i.count > 0);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
      {/* Mobile: logo + título de página */}
      <div className="md:hidden flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
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

        {/* Campana con menú de alertas */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Alertas"
          >
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Alertas</p>
              </div>
              {items.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Sin alertas pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {items.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <it.icon className={`w-5 h-5 flex-shrink-0 ${it.color}`} />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{it.label}</span>
                      <span className="text-xs font-bold bg-red-100 text-red-700 rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                        {it.count}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href="/dashboard/notificaciones"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-center text-sm font-medium text-construserv-orange hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700 transition"
              >
                Configurar notificaciones
              </Link>
            </div>
          )}
        </div>

        <div className="w-9 h-9 rounded-full bg-construserv-orange flex items-center justify-center text-white text-sm font-bold">
          {profile?.full_name?.charAt(0).toUpperCase() ?? "U"}
        </div>
      </div>
    </header>
  );
}
