"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, Save, X, ShieldCheck } from "lucide-react";

export interface RolePermissions {
  vehiculos:     { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean };
  mantenciones:  { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean };
  documentos:    { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean };
  conductores:   { ver: boolean; crear: boolean; editar: boolean };
  reportes:      { ver: boolean };
  notificaciones:{ ver: boolean; configurar: boolean };
}

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  base_role: string;
  permissions: RolePermissions;
}

interface Props {
  initialRoles: CustomRole[];
}

const DEFAULT_PERMISSIONS: RolePermissions = {
  vehiculos:      { ver: true,  crear: false, editar: false, eliminar: false },
  mantenciones:   { ver: true,  crear: false, editar: false, eliminar: false },
  documentos:     { ver: true,  crear: false, editar: false, eliminar: false },
  conductores:    { ver: true,  crear: false, editar: false },
  reportes:       { ver: false },
  notificaciones: { ver: false, configurar: false },
};

const MODULES: { key: keyof RolePermissions; label: string; actions: string[] }[] = [
  { key: "vehiculos",      label: "Vehículos",      actions: ["ver", "crear", "editar", "eliminar"] },
  { key: "mantenciones",   label: "Mantenciones",   actions: ["ver", "crear", "editar", "eliminar"] },
  { key: "documentos",     label: "Documentos",     actions: ["ver", "crear", "editar", "eliminar"] },
  { key: "conductores",    label: "Conductores",    actions: ["ver", "crear", "editar"] },
  { key: "reportes",       label: "Reportes",       actions: ["ver"] },
  { key: "notificaciones", label: "Notificaciones", actions: ["ver", "configurar"] },
];

const ACTION_LABELS: Record<string, string> = {
  ver: "Ver", crear: "Crear", editar: "Editar", eliminar: "Eliminar", configurar: "Configurar",
};

// Calcula el rol base de Supabase automáticamente según los permisos
function inferBaseRole(perms: RolePermissions): string {
  const canDelete = Object.values(perms).some((m) => (m as Record<string, boolean>).eliminar);
  const canCreate = Object.values(perms).some((m) => (m as Record<string, boolean>).crear);
  const canEdit   = Object.values(perms).some((m) => (m as Record<string, boolean>).editar);
  if (canDelete) return "editor";
  if (canCreate || canEdit) return "tecnico";
  return "viewer";
}

export default function RoleManager({ initialRoles }: Props) {
  const supabase = createClient();
  const [roles, setRoles] = useState<CustomRole[]>(initialRoles);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function newRole(): CustomRole {
    return {
      id: "",
      name: "",
      description: "",
      base_role: "viewer",
      permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)),
    };
  }

  function togglePerm(module: keyof RolePermissions, action: string, value: boolean) {
    if (!editing) return;
    setEditing((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: { ...(prev.permissions[module] as Record<string, boolean>), [action]: value },
        },
      };
    });
  }

  async function handleSave() {
    if (!editing?.name.trim()) { setError("El nombre del rol es obligatorio"); return; }
    setSaving(true);
    setError("");

    const payload = {
      name: editing.name.trim(),
      description: editing.description.trim(),
      base_role: inferBaseRole(editing.permissions),
      permissions: editing.permissions,
    };

    let result;
    if (editing.id) {
      result = await supabase.from("custom_roles").update(payload).eq("id", editing.id).select().single();
    } else {
      result = await supabase.from("custom_roles").insert(payload).select().single();
    }

    if (result.error) { setError(result.error.message); setSaving(false); return; }

    if (editing.id) {
      setRoles((prev) => prev.map((r) => r.id === editing.id ? result.data : r));
    } else {
      setRoles((prev) => [...prev, result.data]);
    }
    setEditing(null);
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este rol? Los usuarios asignados quedarán sin rol personalizado.")) return;
    await supabase.from("custom_roles").delete().eq("id", id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-construserv-orange" />
          Roles Personalizados
        </h3>
        {!showForm && (
          <button
            onClick={() => { setEditing(newRole()); setShowForm(true); setError(""); }}
            className="flex items-center gap-1.5 text-sm text-construserv-orange hover:text-orange-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Crear rol
          </button>
        )}
      </div>

      {/* Formulario crear/editar */}
      {showForm && editing && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">{editing.id ? "Editar rol" : "Nuevo rol"}</p>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del rol *</label>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Ej: Chofer, Supervisor, Mecánico..." className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
              <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Describe brevemente este rol..." className={inputClass} />
            </div>
          </div>

          {/* Matriz de permisos */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Permisos de pantalla</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-4 py-2.5 text-gray-600 font-medium text-xs">Módulo</th>
                    {["ver", "crear", "editar", "eliminar", "configurar"].map((a) => (
                      <th key={a} className="px-4 py-2.5 text-gray-600 font-medium text-xs text-center">{ACTION_LABELS[a]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MODULES.map(({ key, label, actions }) => (
                    <tr key={key} className="bg-white">
                      <td className="px-4 py-2.5 font-medium text-gray-700 text-xs">{label}</td>
                      {["ver", "crear", "editar", "eliminar", "configurar"].map((action) => (
                        <td key={action} className="px-4 py-2.5 text-center">
                          {actions.includes(action) ? (
                            <input
                              type="checkbox"
                              checked={(editing.permissions[key] as Record<string, boolean>)[action] ?? false}
                              onChange={(e) => togglePerm(key, action, e.target.checked)}
                              className="w-4 h-4 accent-construserv-orange cursor-pointer"
                            />
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-100">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-construserv-orange hover:bg-orange-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar rol"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de roles */}
      {roles.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-6">No hay roles personalizados. Crea uno para empezar.</p>
      ) : (
        <div className="space-y-2">
          {roles.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800">{r.name}</p>
                </div>
                {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {MODULES.map(({ key, label, actions }) => {
                    const perms = r.permissions[key] as Record<string, boolean>;
                    const active = actions.filter((a) => perms[a]);
                    if (active.length === 0) return null;
                    return (
                      <span key={key} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {label}: {active.map((a) => ACTION_LABELS[a]).join(", ")}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => { setEditing(JSON.parse(JSON.stringify(r))); setShowForm(true); setError(""); }}
                  className="p-1.5 text-gray-400 hover:text-construserv-orange hover:bg-orange-50 rounded-lg transition">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(r.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
