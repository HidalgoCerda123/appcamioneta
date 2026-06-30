"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Wrench,
  FileText,
  Bell,
  Users,
  BarChart3,
  Settings,
  LogOut,
  HardHat,
  ShieldCheck,
  Gauge,
  AlertTriangle,
  ClipboardCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/vehiculos", label: "Vehículos", icon: Truck },
  { href: "/dashboard/obras", label: "Obras", icon: Building2 },
  { href: "/dashboard/conductores", label: "Conductores", icon: HardHat },
  { href: "/dashboard/mantenciones", label: "Mantenciones", icon: Wrench },
  { href: "/dashboard/fallas", label: "Fallas", icon: AlertTriangle },
  { href: "/dashboard/documentos", label: "Documentos", icon: FileText },
  { href: "/dashboard/inspeccion", label: "Inspección", icon: ClipboardCheck },
  { href: "/dashboard/registrar-km", label: "Registrar Km", icon: Gauge },
  { href: "/dashboard/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3 },
];

const adminItems = [
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Users },
  { href: "/dashboard/auditoria", label: "Auditoría", icon: ShieldCheck },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-64 bg-construserv-dark flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center px-6 py-4 border-b border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logo construserv.jpg" alt="Pares y Alvarez" className="h-14 w-auto object-contain" />
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
                ? "bg-construserv-orange text-white"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {profile?.role === "admin" && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administración
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-construserv-orange text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Usuario */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link href="/dashboard/perfil" className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg hover:bg-white/10 transition">
          <div className="w-8 h-8 rounded-full bg-construserv-orange flex items-center justify-center text-white text-sm font-bold">
            {profile?.full_name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
            <p className="text-gray-400 text-xs capitalize">{profile?.role}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
