"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface CustomRole { id: string; name: string; }
interface Props { customRoles?: CustomRole[]; }

export default function InviteUserForm({ customRoles: initialCustomRoles = [] }: Props) {
  const supabase = createClient();
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(initialCustomRoles);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [customRoleId, setCustomRoleId] = useState("");

  useEffect(() => {
    fetch("/api/custom-roles")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCustomRoles(data); });
  }, []);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password && password.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres." });
      setLoading(false);
      return;
    }

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name: name, role, custom_role_id: customRoleId || null, password: password || undefined }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Error al crear usuario" });
    } else if (data.mode === "password") {
      setMessage({ type: "success", text: `Usuario creado. Entrégale estas credenciales — correo: ${email} · contraseña: ${password}` });
      setEmail(""); setName(""); setPassword(""); setRole("viewer"); setCustomRoleId("");
    } else {
      setMessage({ type: "success", text: `Invitación enviada a ${email}` });
      setEmail(""); setName(""); setPassword(""); setRole("viewer"); setCustomRoleId("");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-40">
        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Juan Pérez"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
        />
      </div>
      <div className="flex-1 min-w-48">
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="usuario@empresa.cl"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
        />
      </div>
      <div className="flex-1 min-w-40">
        <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
        <select
          value={customRoleId ? `custom:${customRoleId}` : `system:${role}`}
          onChange={(e) => {
            const v = e.target.value;
            if (v.startsWith("system:")) { setRole(v.replace("system:", "")); setCustomRoleId(""); }
            else { setCustomRoleId(v.replace("custom:", "")); setRole("viewer"); }
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
        >
          <optgroup label="Roles del sistema">
            <option value="system:admin">Administrador</option>
            <option value="system:editor">Editor</option>
            <option value="system:tecnico">Técnico</option>
            <option value="system:viewer">Solo Lectura</option>
          </optgroup>
          {customRoles.length > 0 && (
            <optgroup label="Roles personalizados">
              {customRoles.map((r) => (
                <option key={r.id} value={`custom:${r.id}`}>{r.name}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-construserv-orange hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
      >
        {loading ? "Creando..." : "Crear Usuario"}
      </button>
      {message && (
        <p className={`w-full text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
      <p className="w-full text-xs text-gray-400">
        Si pones una contraseña, el usuario entra de inmediato con su correo y esa clave. Si la dejas vacía, se le envía una invitación por correo.
      </p>
    </form>
  );
}
