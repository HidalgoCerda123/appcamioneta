"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  profileId: string;
  currentRole: string;
}

export default function UserRoleSelect({ profileId, currentRole }: Props) {
  const supabase = createClient();
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    editor: "bg-blue-100 text-blue-700",
    tecnico: "bg-yellow-100 text-yellow-700",
    viewer: "bg-gray-100 text-gray-600",
  };

  async function handleChange(newRole: string) {
    setSaving(true);
    await supabase.from("profiles").update({ role: newRole }).eq("id", profileId);
    setRole(newRole);
    setSaving(false);
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-construserv-orange ${roleColors[role]}`}
    >
      <option value="admin">Administrador</option>
      <option value="editor">Editor</option>
      <option value="tecnico">Técnico</option>
      <option value="viewer">Solo Lectura</option>
    </select>
  );
}
