"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Mail, Send, CheckCircle, XCircle, Loader2, Clock } from "lucide-react";

interface Config {
  id?: string;
  email_to?: string;
  is_active?: boolean;
  notify_days_before?: number[];
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
  initialConfig: Config | null;
  logs: Log[];
}

const DAYS_OPTIONS = [7, 15, 30];

export default function NotificationsConfig({ initialConfig, logs: initialLogs }: Props) {
  const supabase = createClient();

  const [email, setEmail] = useState(initialConfig?.email_to ?? "");
  const [active, setActive] = useState(initialConfig?.is_active ?? true);
  const [daysBefore, setDaysBefore] = useState<number[]>(
    initialConfig?.notify_days_before ?? [7, 15, 30]
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

  async function handleSave() {
    if (!email) return;
    setSaving(true);
    setSaveMsg("");

    const payload = {
      email_to: email,
      is_active: active,
      notify_days_before: daysBefore,
    };

    let error;
    if (initialConfig?.id) {
      ({ error } = await supabase
        .from("notification_configs")
        .update(payload)
        .eq("id", initialConfig.id));
    } else {
      ({ error } = await supabase.from("notification_configs").insert(payload));
    }

    setSaving(false);
    setSaveMsg(error ? `Error: ${error.message}` : "Configuración guardada");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function handleTest() {
    if (!email) {
      setTestResult({ ok: false, msg: "Ingresa un email de destino primero" });
      return;
    }
    setTesting(true);
    setTestResult(null);

    // Guardar configuración primero
    await handleSave();

    // Llamar al endpoint de prueba pasando el email directamente
    const res = await fetch("/api/notifications/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_to: email }),
    });
    const data = await res.json();

    setTesting(false);
    if (data.ok) {
      setTestResult({
        ok: true,
        msg: data.message ?? `Email enviado a ${data.sent_to}. ${data.docs} doc(s), ${data.drivers} licencia(s) y ${data.maintenances ?? 0} mantención(es) incluidas.`,
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

  const inputClass =
    "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-construserv-orange text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notificaciones</h2>
        <p className="text-gray-500 text-sm mt-1">Configura alertas por email para documentos y licencias por vencer</p>
      </div>

      {/* Config card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Mail className="w-4 h-4 text-construserv-orange" />
          Configuración de Email
        </h3>

        {/* Toggle activo */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-800 text-sm">Notificaciones activas</p>
            <p className="text-xs text-gray-500 mt-0.5">Activa o desactiva el envío de alertas</p>
          </div>
          <button
            type="button"
            onClick={() => setActive(!active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              active ? "bg-construserv-orange" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                active ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Email destino */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email de destino *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@construserv.cl"
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">Las alertas se enviarán a este correo</p>
        </div>

        {/* Días de anticipación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alertar con anticipación de
          </label>
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
          <p className="text-xs text-gray-400 mt-2">
            Recibirás un email cuando falten exactamente estos días para el vencimiento
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !email}
            className="flex-1 bg-construserv-orange hover:bg-orange-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !email}
            className="flex-1 border border-construserv-orange text-construserv-orange hover:bg-orange-50 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {testing ? "Enviando..." : "Enviar prueba ahora"}
          </button>
        </div>

        {saveMsg && (
          <p className={`text-sm text-center ${saveMsg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
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

      {/* Info de envío automático */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-800 text-sm flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4" />
          Envío automático diario
        </h3>
        <p className="text-sm text-blue-700">
          Una vez que despliegues la app en Vercel, las notificaciones se enviarán automáticamente cada mañana a las <strong>08:00</strong> revisando todos los vencimientos de los próximos 30 días. Por ahora puedes usar el botón <strong>"Enviar prueba ahora"</strong> para probar el sistema.
        </p>
      </div>

      {/* Historial */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Historial de envíos</h3>
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
