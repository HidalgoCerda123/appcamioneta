"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Save, X, Loader2 } from "lucide-react";

interface NotifPrefs {
  id?: string;
  user_id: string;
  email: string;
  notify_doc_expiry: boolean;
  notify_maintenance: boolean;
  notify_license_expiry: boolean;
  notify_own_vehicle_only: boolean;
}

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  initialPrefs: NotifPrefs | null;
  onClose: () => void;
  onSaved: (prefs: NotifPrefs) => void;
}

export default function UserNotifPrefs({ userId, userName, userEmail, initialPrefs, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [prefs, setPrefs] = useState<NotifPrefs>(
    initialPrefs ?? {
      user_id: userId,
      email: userEmail,
      notify_doc_expiry: true,
      notify_maintenance: true,
      notify_license_expiry: true,
      notify_own_vehicle_only: false,
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!prefs.email) { setError("El email es obligatorio"); return; }
    setSaving(true);
    setError("");

    const payload = {
      user_id: userId,
      email: prefs.email,
      notify_doc_expiry: prefs.notify_doc_expiry,
      notify_maintenance: prefs.notify_maintenance,
      notify_license_expiry: prefs.notify_license_expiry,
      notify_own_vehicle_only: prefs.notify_own_vehicle_only,
    };

    let result;
    if (prefs.id) {
      result = await supabase.from("user_notification_prefs").update(payload).eq("id", prefs.id).select().single();
    } else {
      result = await supabase.from("user_notification_prefs").upsert({ ...payload }, { onConflict: "user_id" }).select().single();
    }

    if (result.error) { setError(result.error.message); setSaving(false); return; }
    onSaved(result.data);
    onClose();
  }

  function toggle(field: keyof NotifPrefs) {
    setPrefs((p) => ({ ...p, [field]: !p[field] }));
  }

  const ToggleRow = ({ field, label, description }: { field: keyof NotifPrefs; label: string; description: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => toggle(field)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${
          prefs[field] ? "bg-construserv-orange" : "bg-gray-300"
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${prefs[field] ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-construserv-orange" />
          Notificaciones — {userName}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Email para notificaciones</label>
        <input
          type="email"
          value={prefs.email}
          onChange={(e) => setPrefs((p) => ({ ...p, email: e.target.value }))}
          placeholder="correo@ejemplo.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-100 px-4">
        <ToggleRow
          field="notify_doc_expiry"
          label="Documentos por vencer"
          description="Alertas de SOAP, revisión técnica, permiso de circulación, etc."
        />
        <ToggleRow
          field="notify_license_expiry"
          label="Licencias por vencer"
          description="Alerta cuando la licencia del conductor está por vencer"
        />
        <ToggleRow
          field="notify_maintenance"
          label="Mantenciones sugeridas"
          description="Alertas de mantenciones próximas por fecha o kilometraje"
        />
        <ToggleRow
          field="notify_own_vehicle_only"
          label="Solo su vehículo asignado"
          description="Si está activo, solo recibe alertas del vehículo que tiene asignado (ideal para choferes)"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-100">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-construserv-orange hover:bg-orange-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
