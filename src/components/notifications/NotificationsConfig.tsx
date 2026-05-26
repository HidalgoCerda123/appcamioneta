"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell, Send, CheckCircle, XCircle, Loader2, Clock,
  ShieldCheck, HardHat, Info,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface NotifConfig {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  days_before: number[];
}

interface LinkedDriver {
  driver_name: string;
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  profile_email: string;
}

interface Log {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  status: string;
  created_at: string;
}

interface Props {
  adminProfiles: Profile[];
  configs: NotifConfig[];
  linkedDrivers: LinkedDriver[];
  logs: Log[];
}

const DAYS_OPTIONS = [7, 15, 30];
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  editor: "Editor",
  tecnico: "Técnico",
  viewer: "Visualizador",
};

export default function NotificationsConfig({ adminProfiles, configs: initialConfigs, linkedDrivers, logs: initialLogs }: Props) {
  const supabase = createClient();
  const [configs, setConfigs] = useState<NotifConfig[]>(initialConfigs);
  const [daysBefore, setDaysBefore] = useState<number[]>(
    initialConfigs[0]?.days_before ?? [7, 15, 30]
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [logs, setLogs] = useState(initialLogs);

  function toggleDay(d: number) {
    setDaysBefore((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  function isEnabled(profileId: string) {
    return configs.some((c) => c.user_id === profileId && c.is_active);
  }

  async function toggleAdmin(profile: Profile) {
    const existing = configs.find((c) => c.user_id === profile.id);
    if (existing) {
      const newActive = !existing.is_active;
      await supabase.from("notification_configs").update({ is_active: newActive }).eq("id", existing.id);
      setConfigs((prev) => prev.map((c) => c.id === existing.id ? { ...c, is_active: newActive } : c));
    } else {
      const { data } = await supabase.from("notification_configs").insert({
        user_id: profile.id,
        email: profile.email,
        is_active: true,
        notify_doc_expiry: true,
        notify_maintenance: true,
        notify_license_expiry: true,
        notify_own_vehicle_only: false,
        days_before: daysBefore,
      }).select().single();
      if (data) setConfigs((prev) => [...prev, data as NotifConfig]);
    }
  }

  async function handleSaveDays() {
    setSaving(true);
    setSaveMsg("");
    for (const c of configs) {
      await supabase.from("notification_configs").update({ days_before: daysBefore }).eq("id", c.id);
    }
    setConfigs((prev) => prev.map((c) => ({ ...c, days_before: daysBefore })));
    setSaving(false);
    setSaveMsg("Configuración guardada");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const activeCount = configs.filter((c) => c.is_active).length;
    if (activeCount === 0) {
      setTestResult({ ok: false, msg: "Activa al menos un destinatario primero." });
      setTesting(false);
      return;
    }
    const res = await fetch("/api/notifications/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days_before: daysBefore }),
    });
    const data = await res.json();
    setTesting(false);
    if (data.ok) {
      setTestResult({
        ok: true,
        msg: data.message ?? `Emails enviados a ${data.sent} destinatario(s). ${data.docs} doc(s), ${data.drivers} licencia(s), ${data.maintenances ?? 0} mantención(es).`,
      });
      const { data: newLogs } = await supabase
        .from("notification_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (newLogs) setLogs(newLogs);
    } else {
      setTestResult({ ok: false, msg: data.error ?? "Error al enviar" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notificaciones</h2>
        <p className="text-gray-500 text-sm mt-1">
          Alertas automáticas por email — se envían cada mañana a las 08:00
        </p>
      </div>

      {/* Cómo funciona */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-800 text-sm flex items-center gap-2 mb-2">
          <Info className="w-4 h-4" /> Cómo funciona
        </h3>
        <ul className="text-sm text-blue-700 space-y-1.5">
          <li>• <strong>Administradores activos:</strong> reciben alertas de <em>todos</em> los vehículos, documentos y licencias de conductores por vencer.</li>
          <li>• <strong>Conductores vinculados:</strong> reciben alertas solo de <em>su vehículo</em> asignado y su propia licencia.</li>
          <li>• Se alerta cuando faltan <strong>{daysBefore.length > 0 ? daysBefore.join(", ") : "—"} días</strong> para el vencimiento.</li>
        </ul>
      </div>

      {/* Administradores */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-construserv-orange" />
          Administradores y Encargados
        </h3>
        <p className="text-xs text-gray-500">
          Activa quién recibe el resumen completo de todas las alertas de la flota.
        </p>
        <div className="divide-y divide-gray-50">
          {adminProfiles.map((profile) => {
            const enabled = isEnabled(profile.id);
            return (
              <div key={profile.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-construserv-orange flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{profile.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {profile.email} · {ROLE_LABELS[profile.role] ?? profile.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAdmin(profile)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    enabled ? "bg-construserv-orange" : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            );
          })}
          {adminProfiles.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No hay usuarios registrados.</p>
          )}
        </div>
      </div>

      {/* Conductores vinculados */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <HardHat className="w-4 h-4 text-construserv-orange" />
          Conductores con Cuenta Vinculada
        </h3>
        <p className="text-xs text-gray-500">
          Reciben automáticamente alertas de su vehículo asignado y su propia licencia.
        </p>
        {linkedDrivers.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {linkedDrivers.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                    {d.driver_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.driver_name}</p>
                    <p className="text-xs text-gray-400">
                      {d.vehicle_brand} {d.vehicle_model} — {d.vehicle_plate} · {d.profile_email}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full flex-shrink-0">
                  Automático
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <HardHat className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Ningún conductor tiene una cuenta vinculada aún.</p>
            <p className="text-xs text-gray-400 mt-1">
              Vincula conductores desde la ficha del conductor → Vincular con cuenta.
            </p>
          </div>
        )}
      </div>

      {/* Días de anticipación + acciones */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-construserv-orange" />
          Días de Anticipación
        </h3>
        <p className="text-xs text-gray-500">
          Se enviará una alerta cuando falten exactamente estos días para el vencimiento.
        </p>
        <div className="flex gap-3">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                daysBefore.includes(d)
                  ? "bg-construserv-orange text-white border-construserv-orange"
                  : "bg-white text-gray-600 border-gray-300 hover:border-construserv-orange"
              }`}
            >
              {d} días
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleSaveDays}
            disabled={saving}
            className="flex items-center gap-2 bg-construserv-orange hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 border border-construserv-orange text-construserv-orange hover:bg-orange-50 px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {testing ? "Enviando..." : "Enviar prueba ahora"}
          </button>
        </div>
        {saveMsg && (
          <p className={`text-sm ${saveMsg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
            {saveMsg}
          </p>
        )}
        {testResult && (
          <div className={`flex items-start gap-3 p-4 rounded-lg ${
            testResult.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}>
            {testResult.ok
              ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            <p className={`text-sm ${testResult.ok ? "text-green-700" : "text-red-700"}`}>
              {testResult.msg}
            </p>
          </div>
        )}
      </div>

      {/* Historial */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Historial de envíos recientes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {log.status === "sent"
                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  <div>
                    <p className="text-sm text-gray-800">{log.subject}</p>
                    <p className="text-xs text-gray-400">{log.recipient}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
