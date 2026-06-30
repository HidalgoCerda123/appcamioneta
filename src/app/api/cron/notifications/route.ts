import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { computePlanStatus, kmServiceStatus, type MaintenancePlan } from "@/lib/maintenance";

const MAINT_LABELS: Record<string, string> = {
  aceite: "Aceite", frenos: "Frenos", neumaticos: "Neumáticos", filtros: "Filtros",
  suspension: "Suspensión", electrico: "Eléctrico", general: "General", otro: "Otro",
};

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number) {
  if (days < 0) return "#dc2626";
  if (days <= 7) return "#dc2626";
  if (days <= 15) return "#d97706";
  return "#16a34a";
}

function urgencyText(days: number) {
  if (days < 0) return `VENCIDO (hace ${Math.abs(days)} días)`;
  if (days === 0) return "Vence HOY";
  return `Vence en ${days} días`;
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const thStyle = `padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:12px;background:#f3f4f6;`;
const tdStyle = `padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;vertical-align:top;`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterByDays(items: any[], dateField: string, daysBefore: number[]): any[] {
  const maxDays = Math.max(...daysBefore);
  return items.filter((item) => {
    const days = daysUntil(item[dateField]);
    return days <= maxDays;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEmail(title: string, docs: any[], licencias: any[], maints: any[], driverMap: Record<string, string>, preventive: { label: string; vehicle: string; detail: string; overdue: boolean }[] = []): string {
  const total = docs.length + licencias.length + maints.length + preventive.length;

  const prevRows = preventive.map((p) => `<tr>
      <td style="${tdStyle}">${p.label}</td>
      <td style="${tdStyle}">${p.vehicle}</td>
      <td style="${tdStyle}font-weight:600;color:${p.overdue ? "#dc2626" : "#d97706"};">${p.detail}</td>
    </tr>`).join("");

  const docRows = docs.map((d) => {
    const days = daysUntil(d.expiry_date);
    const veh = d.vehicle as { id: string; brand: string; model: string; plate: string } | null;
    const conductor = veh ? (driverMap[veh.id] ?? "Sin conductor") : "—";
    return `<tr>
      <td style="${tdStyle}">${d.label}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
      <td style="${tdStyle}">${fmtDate(d.expiry_date)}</td>
      <td style="${tdStyle}">${conductor}</td>
      <td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td>
    </tr>`;
  }).join("");

  const licRows = licencias.map((d) => {
    const days = daysUntil(d.license_expiry);
    const veh = d.vehicle as { brand: string; model: string; plate: string } | null;
    return `<tr>
      <td style="${tdStyle}">${d.driver_name}${d.license_type ? ` (${d.license_type})` : ""}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
      <td style="${tdStyle}">${fmtDate(d.license_expiry)}</td>
      <td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td>
    </tr>`;
  }).join("");

  const maintRows = maints.map((m) => {
    const days = daysUntil(m.next_service_date);
    const veh = m.vehicle as { id: string; brand: string; model: string; plate: string } | null;
    const conductor = veh ? (driverMap[veh.id] ?? "Sin conductor") : "—";
    return `<tr>
      <td style="${tdStyle}">${m.type}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
      <td style="${tdStyle}">${fmtDate(m.next_service_date)}</td>
      <td style="${tdStyle}">${conductor}</td>
      <td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
<div style="max-width:700px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:#1A1A2E;padding:24px 32px;">
    <p style="margin:0;color:white;font-size:20px;font-weight:bold;">🔔 Flotapp</p>
    <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">${title} — ${new Date().toLocaleDateString("es-CL", { dateStyle: "long" })}</p>
  </div>
  <div style="padding:32px;">
    <p style="margin:0 0 28px;color:#374151;font-size:15px;">Tienes <strong>${total} alerta(s)</strong> que requieren atención:</p>
    ${docs.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #3b82f6;padding-left:10px;">📄 Documentos por Vencer (${docs.length})</h3>
    <div style="overflow-x:auto;margin-bottom:28px;"><table style="width:100%;border-collapse:collapse;min-width:480px;">
      <thead><tr><th style="${thStyle}">Documento</th><th style="${thStyle}">Vehículo</th><th style="${thStyle}">Vencimiento</th><th style="${thStyle}">Conductor</th><th style="${thStyle}">Estado</th></tr></thead>
      <tbody>${docRows}</tbody>
    </table></div>` : ""}
    ${licencias.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #8b5cf6;padding-left:10px;">👷 Licencias de Conductores (${licencias.length})</h3>
    <div style="overflow-x:auto;margin-bottom:28px;"><table style="width:100%;border-collapse:collapse;min-width:400px;">
      <thead><tr><th style="${thStyle}">Conductor</th><th style="${thStyle}">Vehículo</th><th style="${thStyle}">Vence Licencia</th><th style="${thStyle}">Estado</th></tr></thead>
      <tbody>${licRows}</tbody>
    </table></div>` : ""}
    ${maints.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #E8500A;padding-left:10px;">🔧 Mantenciones Próximas (${maints.length})</h3>
    <div style="overflow-x:auto;margin-bottom:28px;"><table style="width:100%;border-collapse:collapse;min-width:480px;">
      <thead><tr><th style="${thStyle}">Tipo</th><th style="${thStyle}">Vehículo</th><th style="${thStyle}">Fecha</th><th style="${thStyle}">Conductor</th><th style="${thStyle}">Estado</th></tr></thead>
      <tbody>${maintRows}</tbody>
    </table></div>` : ""}
    ${preventive.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #f59e0b;padding-left:10px;">🗓️ Mantención Preventiva por Vencer (${preventive.length})</h3>
    <div style="overflow-x:auto;margin-bottom:28px;"><table style="width:100%;border-collapse:collapse;min-width:480px;">
      <thead><tr><th style="${thStyle}">Tipo</th><th style="${thStyle}">Vehículo</th><th style="${thStyle}">Estado</th></tr></thead>
      <tbody>${prevRows}</tbody>
    </table></div>` : ""}
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;">
      <p style="margin:0;color:#9a3412;font-size:13px;">Ingresa a <strong>Flotapp</strong> para gestionar estas alertas.</p>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Pares y Alvarez — Sistema de Gestión de Flota</p>
  </div>
</div></body></html>`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Configs activas (una por admin/encargado)
  const { data: configs } = await supabase
    .from("notification_configs")
    .select("*")
    .eq("is_active", true)
    .not("user_id", "is", null);

  const daysBefore: number[] = configs?.[0]?.days_before ?? [7, 15, 30];
  const maxDays = Math.max(...daysBefore);
  const inMaxDays = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Traer todos los datos de la flota
  const [{ data: allDocs }, { data: allDrivers }, { data: allMaints }] = await Promise.all([
    supabase.from("vehicle_documents")
      .select("*, vehicle:vehicles(id, brand, model, plate)")
      .lte("expiry_date", inMaxDays).order("expiry_date"),
    supabase.from("vehicle_drivers")
      .select("*, vehicle:vehicles(id, brand, model, plate)")
      .is("end_date", null).not("license_expiry", "is", null)
      .lte("license_expiry", inMaxDays).order("license_expiry"),
    supabase.from("maintenances")
      .select("*, vehicle:vehicles(id, brand, model, plate)")
      .not("next_service_date", "is", null)
      .lte("next_service_date", inMaxDays).order("next_service_date"),
  ]);

  // Mapa conductor activo por vehículo
  const { data: activeDrivers } = await supabase
    .from("vehicle_drivers").select("vehicle_id, driver_name").is("end_date", null);
  const driverMap: Record<string, string> = {};
  for (const d of activeDrivers ?? []) driverMap[d.vehicle_id] = d.driver_name;

  const alertDocs = filterByDays(allDocs ?? [], "expiry_date", daysBefore);
  const alertDrivers = filterByDays(allDrivers ?? [], "license_expiry", daysBefore);
  const alertMaints = filterByDays(allMaints ?? [], "next_service_date", daysBefore);

  let sent = 0;

  // ── 1. Enviar a conductores vinculados (solo su vehículo + su licencia) ──
  const { data: linkedDrivers } = await supabase
    .from("vehicle_drivers")
    .select("profile_id, vehicle_id, driver_name, license_expiry, vehicle:vehicles(id, brand, model, plate), profile:profiles(id, email)")
    .is("end_date", null)
    .not("profile_id", "is", null);

  for (const ld of linkedDrivers ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = ld.profile as any;
    if (!profile?.email) continue;

    const vId = ld.vehicle_id;
    const myDocs = alertDocs.filter((d) => (d.vehicle as { id: string } | null)?.id === vId);
    const myMaints = alertMaints.filter((m) => (m.vehicle as { id: string } | null)?.id === vId);
    const myLic = ld.license_expiry && daysUntil(ld.license_expiry) <= maxDays
      ? alertDrivers.filter((d) => d.profile_id === ld.profile_id || d.driver_name === ld.driver_name)
      : [];

    if (myDocs.length === 0 && myMaints.length === 0 && myLic.length === 0) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const veh = ld.vehicle as any;
    const html = buildEmail(
      `Alertas de ${veh?.brand ?? ""} ${veh?.model ?? ""} (${veh?.plate ?? ""})`,
      myDocs, myLic, myMaints, driverMap
    );

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: profile.email,
      subject: `🔔 Flotapp — ${myDocs.length + myLic.length + myMaints.length} alerta(s) de tu vehículo`,
      html,
    });

    await supabase.from("notification_log").insert({
      type: "email", recipient: profile.email,
      subject: `Alertas vehículo — ${myDocs.length + myLic.length + myMaints.length} items`,
      status: error ? "failed" : "sent",
    });
    if (!error) sent++;
  }

  // ── Preventivas de la flota (para el correo del admin) ──
  const preventiveAdmin: { label: string; vehicle: string; detail: string; overdue: boolean }[] = [];
  const { data: planRows } = await supabase.from("maintenance_plans").select("*").eq("active", true);
  if (planRows && planRows.length > 0) {
    const [{ data: vehRows }, { data: maintAll }] = await Promise.all([
      supabase.from("vehicles").select("id, brand, model, plate, current_km, usage_unit"),
      supabase.from("maintenances").select("vehicle_id, type, km_at_service, date").order("date", { ascending: false }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehMap: Record<string, any> = {};
    for (const v of vehRows ?? []) vehMap[v.id] = v;
    const lastMap: Record<string, { km_at_service: number; date: string }> = {};
    for (const m of maintAll ?? []) {
      const key = `${m.vehicle_id}|${m.type}`;
      if (!lastMap[key]) lastMap[key] = { km_at_service: m.km_at_service, date: m.date };
    }
    for (const plan of planRows) {
      const veh = vehMap[plan.vehicle_id];
      if (!veh) continue;
      const last = lastMap[`${plan.vehicle_id}|${plan.type}`] ?? null;
      const st = computePlanStatus(plan as MaintenancePlan, last, veh.current_km, veh.usage_unit);
      if (st.level !== "overdue" && st.level !== "soon") continue;
      const us = veh.usage_unit === "horas" ? "h" : "km";
      const parts: string[] = [];
      if (st.remainingValue !== null) {
        parts.push(st.remainingValue <= 0
          ? `Vencida por ${Math.abs(st.remainingValue).toLocaleString("es-CL")} ${us}`
          : `Faltan ${st.remainingValue.toLocaleString("es-CL")} ${us}`);
      }
      if (st.daysLeft !== null) {
        parts.push(st.daysLeft <= 0 ? `vencida hace ${Math.abs(st.daysLeft)} días` : `${st.daysLeft} días`);
      }
      preventiveAdmin.push({
        label: MAINT_LABELS[plan.type] ?? plan.type,
        vehicle: `${veh.brand} ${veh.model} (${veh.plate})`,
        detail: parts.join(" · "),
        overdue: st.level === "overdue",
      });
    }
    preventiveAdmin.sort((a, b) => (a.overdue === b.overdue ? 0 : a.overdue ? -1 : 1));
  }

  // Mantenciones programadas por km objetivo (next_service_km), la más reciente por vehículo+tipo
  {
    const [{ data: vehRows2 }, { data: maintKmRows }] = await Promise.all([
      supabase.from("vehicles").select("id, brand, model, plate, current_km, usage_unit"),
      supabase.from("maintenances").select("vehicle_id, type, next_service_km, date").not("next_service_km", "is", null).order("date", { ascending: false }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vmap: Record<string, any> = {};
    for (const v of vehRows2 ?? []) vmap[v.id] = v;
    const seen = new Set<string>();
    for (const m of maintKmRows ?? []) {
      const key = `${m.vehicle_id}|${m.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const veh = vmap[m.vehicle_id];
      if (!veh) continue;
      const st = kmServiceStatus(m.next_service_km, veh.current_km, veh.usage_unit ?? "km");
      if (!st.due) continue;
      const us = veh.usage_unit === "horas" ? "h" : "km";
      preventiveAdmin.push({
        label: `${MAINT_LABELS[m.type] ?? m.type} (por ${us})`,
        vehicle: `${veh.brand} ${veh.model} (${veh.plate})`,
        detail: st.overdue
          ? `Vencida por ${Math.abs(st.remaining).toLocaleString("es-CL")} ${us}`
          : `Faltan ${st.remaining.toLocaleString("es-CL")} ${us}`,
        overdue: st.overdue,
      });
    }
    preventiveAdmin.sort((a, b) => (a.overdue === b.overdue ? 0 : a.overdue ? -1 : 1));
  }

  // ── 2. Enviar a administradores (TODA la flota) ──
  if ((alertDocs.length > 0 || alertDrivers.length > 0 || alertMaints.length > 0 || preventiveAdmin.length > 0) && configs && configs.length > 0) {
    const total = alertDocs.length + alertDrivers.length + alertMaints.length + preventiveAdmin.length;
    const html = buildEmail("Resumen completo de la flota", alertDocs, alertDrivers, alertMaints, driverMap, preventiveAdmin);

    for (const config of configs) {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM!,
        to: config.email,
        subject: `🔔 Flotapp — ${total} alerta(s) de la flota`,
        html,
      });

      await supabase.from("notification_log").insert({
        type: "email", recipient: config.email,
        subject: `Resumen flota — ${total} alertas`,
        status: error ? "failed" : "sent",
      });
      if (!error) sent++;
    }
  }

  return NextResponse.json({
    ok: true, sent,
    docs: alertDocs.length,
    drivers: alertDrivers.length,
    maintenances: alertMaints.length,
  });
}
