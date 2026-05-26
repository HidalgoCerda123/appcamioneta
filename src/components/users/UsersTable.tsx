"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, BellOff, Truck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import UserNotifPrefs from "@/components/admin/UserNotifPrefs";
import Link from "next/link";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  custom_role_id?: string;
  created_at: string;
}

interface CustomRole {
  id: string;
  name: string;
  base_role: string;
}

interface NotifPref {
  id: string;
  user_id: string;
  email: string;
  notify_doc_expiry: boolean;
  notify_maintenance: boolean;
  notify_license_expiry: boolean;
  notify_own_vehicle_only: boolean;
}

interface LinkedDriver {
  profile_id: string;
  driver_name: string;
  driver_id: string;
  vehicle_plate: string | null;
  vehicle_id: string | null;
}

interface Props {
  profiles: Profile[];
  currentUserId: string;
  customRoles: CustomRole[];
  notifPrefs: NotifPref[];
  linkedDrivers: LinkedDriver[];
}

// Roles predefinidos del sistema (siempre disponibles)
const SYSTEM_ROLES = [
  { id: "__admin",   value: "admin",   label: "Administrador",  color: "bg-red-100 text-red-700" },
  { id: "__editor",  value: "editor",  label: "Editor",         color: "bg-blue-100 text-blue-700" },
  { id: "__tecnico", value: "tecnico", label: "Técnico",        color: "bg-yellow-100 text-yellow-700" },
  { id: "__viewer",  value: "viewer",  label: "Solo Lectura",   color: "bg-gray-100 text-gray-600" },
];

export default function UsersTable({ profiles, currentUserId, customRoles: initialCustomRoles, notifPrefs: initialNotifPrefs, linkedDrivers }: Props) {
  const supabase = createClient();
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(initialCustomRoles);
  const [notifPrefs, setNotifPrefs] = useState<NotifPref[]>(initialNotifPrefs);
  const [openNotifFor, setOpenNotifFor] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Obtener roles frescos desde el API (bypasa RLS)
  useEffect(() => {
    fetch("/api/custom-roles")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCustomRoles(data); });
  }, []);

  // Estado unificado: "custom:UUID" o "system:admin" etc.
  const [roleMap, setRoleMap] = useState<Record<string, string>>(
    Object.fromEntries(
      profiles.map((p) => [
        p.id,
        p.custom_role_id ? `custom:${p.custom_role_id}` : `system:${p.role}`,
      ])
    )
  );

  async function handleRoleChange(profileId: string, value: string) {
    setSaving(profileId);
    if (value.startsWith("system:")) {
      const sysRole = value.replace("system:", "");
      await supabase.from("profiles").update({ role: sysRole, custom_role_id: null }).eq("id", profileId);
    } else {
      const customRoleId = value.replace("custom:", "");
      const cr = customRoles.find((r) => r.id === customRoleId);
      await supabase.from("profiles").update({
        role: cr?.base_role ?? "viewer",
        custom_role_id: customRoleId,
      }).eq("id", profileId);
    }
    setRoleMap((prev) => ({ ...prev, [profileId]: value }));
    setSaving(null);
  }

  function getRoleLabel(value: string): { label: string; color: string } {
    if (value.startsWith("system:")) {
      const sys = SYSTEM_ROLES.find((r) => r.value === value.replace("system:", ""));
      return { label: sys?.label ?? value, color: sys?.color ?? "bg-gray-100 text-gray-600" };
    }
    const cr = customRoles.find((r) => r.id === value.replace("custom:", ""));
    return { label: cr?.name ?? "Rol personalizado", color: "bg-purple-100 text-purple-700" };
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Usuario</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Email</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Rol</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Conductor</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Notificaciones</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Registrado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {profiles.map((p) => {
              const pref = notifPrefs.find((n) => n.user_id === p.id);
              const hasNotif = !!pref?.email;
              const isCurrentUser = p.id === currentUserId;
              const currentValue = roleMap[p.id] ?? `system:${p.role}`;
              const { label, color } = getRoleLabel(currentValue);
              const linkedDriver = linkedDrivers.find((d) => d.profile_id === p.id);

              return (
                <React.Fragment key={p.id}>
                  <tr>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-construserv-orange flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {p.full_name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <span className="font-medium text-gray-800">{p.full_name}</span>
                        {isCurrentUser && <span className="text-xs text-gray-400">(tú)</span>}
                      </div>
                    </td>

                    <td className="px-5 py-3 text-gray-600 text-xs">{p.email}</td>

                    {/* Rol unificado */}
                    <td className="px-5 py-3">
                      {isCurrentUser ? (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
                          {label}
                        </span>
                      ) : (
                        <select
                          value={currentValue}
                          onChange={(e) => handleRoleChange(p.id, e.target.value)}
                          disabled={saving === p.id}
                          className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-construserv-orange bg-white text-gray-700 cursor-pointer"
                        >
                          <optgroup label="Roles del sistema">
                            {SYSTEM_ROLES.map((r) => (
                              <option key={r.id} value={`system:${r.value}`}>{r.label}</option>
                            ))}
                          </optgroup>
                          {customRoles.length > 0 && (
                            <optgroup label="Roles personalizados">
                              {customRoles.map((r) => (
                                <option key={r.id} value={`custom:${r.id}`}>{r.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      )}
                    </td>

                    {/* Conductor vinculado */}
                    <td className="px-5 py-3">
                      {linkedDriver ? (
                        <Link
                          href={`/dashboard/conductores/${linkedDriver.driver_id}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition w-fit"
                        >
                          <Truck className="w-3 h-3 flex-shrink-0" />
                          <span>{linkedDriver.driver_name}</span>
                          {linkedDriver.vehicle_plate && (
                            <span className="text-green-500">· {linkedDriver.vehicle_plate}</span>
                          )}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">Sin conductor</span>
                      )}
                    </td>

                    {/* Notificaciones */}
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setOpenNotifFor(openNotifFor === p.id ? null : p.id)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${
                          hasNotif
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {hasNotif ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                        {hasNotif ? pref.email.split("@")[0] + "..." : "Configurar"}
                      </button>
                    </td>

                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(p.created_at)}</td>
                  </tr>

                  {/* Panel notificaciones inline */}
                  {openNotifFor === p.id && (
                    <tr>
                      <td colSpan={6} className="px-5 py-3 bg-gray-50">
                        <UserNotifPrefs
                          userId={p.id}
                          userName={p.full_name}
                          userEmail={p.email}
                          initialPrefs={pref ?? null}
                          onClose={() => setOpenNotifFor(null)}
                          onSaved={(updated) => {
                            setNotifPrefs((prev) => {
                              const cast = updated as NotifPref;
                              const exists = prev.find((n) => n.user_id === p.id);
                              if (exists) return prev.map((n) => n.user_id === p.id ? cast : n);
                              return [...prev, cast];
                            });
                            setOpenNotifFor(null);
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
