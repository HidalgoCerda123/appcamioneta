"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Wrench,
  FileText,
  MoreHorizontal,
  X,
  HardHat,
  Bell,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types";

const mainItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/vehiculos", label: "Vehículos", icon: Truck },
  { href: "/dashboard/mantenciones", label: "Mantenciones", icon: Wrench },
  { href: "/dashboard/documentos", label: "Documentos", icon: FileText },
];

const moreItems = [
  { href: "/dashboard/conductores", label: "Conductores", icon: HardHat },
  { href: "/dashboard/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3 },
];

const adminItems = [
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Users },
  { href: "/dashboard/auditoria", label: "Auditoría", icon: ShieldCheck },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export default function MobileNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = [...moreItems, ...adminItems].some(
    (item) => pathname.startsWith(item.href)
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Overlay "Más" */}
      {showMore && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800 dark:text-gray-100">Más opciones</span>
              <button onClick={() => setShowMore(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {moreItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-medium transition",
                    pathname.startsWith(href)
                      ? "bg-construserv-orange text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-6 h-6" />
                  {label}
                </Link>
              ))}
            </div>

            {profile?.role === "admin" && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Administración
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {adminItems.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setShowMore(false)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-medium transition",
                        pathname.startsWith(href)
                          ? "bg-construserv-orange text-white"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="w-6 h-6" />
                      {label}
                    </Link>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 hover:bg-red-100 transition font-medium"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Barra de navegación inferior */}
      <nav className="mobile-nav md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-30 flex items-stretch shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        {mainItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition",
                isActive
                  ? "text-construserv-orange"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Botón "Más" */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition",
            isMoreActive || showMore
              ? "text-construserv-orange"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>Más</span>
        </button>
      </nav>
    </>
  );
}
