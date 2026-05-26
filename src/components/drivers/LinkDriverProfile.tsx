"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCheck, X, CheckCircle, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Props {
  /** Todos los IDs de registros vehicle_drivers de este conductor (historial completo) */
  driverRecordIds: string[];
  driverName: string;
  linkedProfile: Profile | null;
  allProfiles: Profile[];
}

export default function LinkDriverProfile({ driverRecordIds, driverName, linkedProfile: initial, allProfiles }: Props) {
  const supabase = createClient();
  const [linked, setLinked] = useState<Profile | null>(initial);
  const [selecting, setSelecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Perfiles que no están vinculados a otro conductor (excluye el actual)
  const available = allProfiles.filter((p) => p.id !== linked?.id);

  async function handleLink(profileId: string) {
    setSaving(true);
    setMsg("");
    // Actualizar todos los registros de este conductor
    const { error } = await supabase
      .from("vehicle_drivers")
      .update({ profile_id: profileId })
      .in("id", driverRecordIds);

    if (error) {
      setMsg("Error: " + error.message);
    } else {
      const profile = allProfiles.find((p) => p.id === profileId) ?? null;
      setLinked(profile);
      setSelecting(false);
      setMsg("Vinculación guardada correctamente.");
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  }

  async function handleUnlink() {
    if (!confirm(`¿Desvincular a ${driverName} de la cuenta ${linked?.email}?`)) return;
    setSaving(true);
    const { error } = await supabase
      .from("vehicle_drivers")
      .update({ profile_id: null })
      .in("id", driverRecordIds);

    if (error) {
      setMsg("Error: " + error.message);
    } else {
      setLinked(null);
      setMsg("Desvinculado correctamente.");
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-construserv-orange" />
        Cuenta de Usuario Vinculada
      </h3>

      {linked ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-construserv-orange flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {linked.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{linked.full_name}</p>
              <p className="text-xs text-gray-500">{linked.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelecting(!selecting)}
              className="text-xs text-blue-600 hover:underline"
            >
              Cambiar
            </button>
            <button
              onClick={handleUnlink}
              disabled={saving}
              className="p-1 text-gray-400 hover:text-red-500 transition"
              title="Desvincular"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          Este conductor no está vinculado a ninguna cuenta de usuario.
        </p>
      )}

      {/* Selector */}
      {(!linked || selecting) && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {linked ? "Cambiar a:" : "Vincular con usuario:"}
          </label>
          <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {available.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No hay usuarios disponibles</p>
            ) : (
              available.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleLink(p.id)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{p.email}</p>
                  </div>
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                </button>
              ))
            )}
          </div>
          {selecting && (
            <button onClick={() => setSelecting(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Cancelar
            </button>
          )}
        </div>
      )}

      {msg && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {msg}
        </div>
      )}
    </div>
  );
}
