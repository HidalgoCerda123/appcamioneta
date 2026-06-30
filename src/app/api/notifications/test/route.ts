import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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

export async function POST(req: Request) {
  let daysBefore: number[] = [7, 15, 30];
  try {
    const body = await req.json();
    if (Array.isArray(body?.days_before) && body.days_before.length > 0) {
      daysBefore = body.days_before;
    }
  } catch { /* body vacío */ }

  const maxDays = Math.max(...daysBefore);
  const inMaxDays = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Destinatarios activos
  const { data: configs } = await supabase
    .from("notification_configs")
    .select("email, user_id")
    .eq("is_active", true)
    .not("user_id", "is", null);

  if (!configs || configs.length === 0) {
    return NextResponse.json({ error: "Sin destinatarios activos. Activa al menos un administrador en la página de Notificaciones." }, { status: 400 });
  }

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

  const { data: activeDriversRaw } = await supabase
    .from("vehicle_drivers").select("vehicle_id, driver_name").is("end_date", null);
  const driverMap: Record<string, string> = {};
  for (const d of activeDriversRaw ?? []) driverMap[d.vehicle_id] = d.driver_name;

  const alertDocs = (allDocs ?? []).filter((d) => daysUntil(d.expiry_date) <= maxDays);
  const alertDrivers = (allDrivers ?? []).filter((d) => daysUntil(d.license_expiry) <= maxDays);
  const alertMaints = (allMaints ?? []).filter((m) => m.next_service_date && daysUntil(m.next_service_date) <= maxDays);
  const total = alertDocs.length + alertDrivers.length + alertMaints.length;

  if (total === 0) {
    return NextResponse.json({
      ok: true,
      message: `Sin alertas en los próximos ${maxDays} días. El sistema está al día.`,
      sent: 0, docs: 0, drivers: 0, maintenances: 0,
    });
  }

  const docRows = alertDocs.map((d) => {
    const days = daysUntil(d.expiry_date);
    const veh = d.vehicle as { id: string; brand: string; model: string; plate: string } | null;
    return `<tr>
      <td style="${tdStyle}">${d.label}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
      <td style="${tdStyle}">${fmtDate(d.expiry_date)}</td>
      <td style="${tdStyle}">${veh ? (driverMap[veh.id] ?? "Sin conductor") : "—"}</td>
      <td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td>
    </tr>`;
  }).join("");

  const licRows = alertDrivers.map((d) => {
    const days = daysUntil(d.license_expiry);
    const veh = d.vehicle as { brand: string; model: string; plate: string } | null;
    return `<tr>
      <td style="${tdStyle}">${d.driver_name}${d.license_type ? ` (${d.license_type})` : ""}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
      <td style="${tdStyle}">${fmtDate(d.license_expiry)}</td>
      <td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td>
    </tr>`;
  }).join("");

  const maintRows = alertMaints.map((m) => {
    const days = daysUntil(m.next_service_date);
    const veh = m.vehicle as { id: string; brand: string; model: string; plate: string } | null;
    return `<tr>
      <td style="${tdStyle}">${m.type}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
      <td style="${tdStyle}">${fmtDate(m.next_service_date)}</td>
      <td style="${tdStyle}">${veh ? (driverMap[veh.id] ?? "Sin conductor") : "—"}</td>
      <td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
<div style="max-width:700px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:#1A1A2E;padding:24px 32px;">
    <p style="margin:0;color:white;font-size:20px;font-weight:bold;">🔔 Flotapp</p>
    <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Resumen completo de la flota — ${new Date().toLocaleDateString("es-CL", { dateStyle: "long" })}</p>
  </div>
  <div style="padding:32px;">
    <p style="margin:0 0 28px;color:#374151;font-size:15px;"><strong>⚠️ EMAIL DE PRUEBA</strong> — Tienes <strong>${total} alerta(s)</strong>:</p>
    ${alertDocs.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #3b82f6;padding-left:10px;">📄 Documentos por Vencer (${alertDocs.length})</h3>
    <div style="overflow-x:auto;margin-bottom:28px;"><table style="width:100%;border-collapse:collapse;min-width:480px;">
      <thead><tr><th style="${thStyle}">Documento</th><th style="${thStyle}">Vehículo</th><th style="${thStyle}">Vencimiento</th><th style="${thStyle}">Conductor</th><th style="${thStyle}">Estado</th></tr></thead>
      <tbody>${docRows}</tbody></table></div>` : ""}
    ${alertDrivers.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #8b5cf6;padding-left:10px;">👷 Licencias de Conductores (${alertDrivers.length})</h3>
    <div style="overflow-x:auto;margin-bottom:28px;"><table style="width:100%;border-collapse:collapse;min-width:400px;">
      <thead><tr><th style="${thStyle}">Conductor</th><th style="${thStyle}">Vehículo</th><th style="${thStyle}">Vence Licencia</th><th style="${thStyle}">Estado</th></tr></thead>
      <tbody>${licRows}</tbody></table></div>` : ""}
    ${alertMaints.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #E8500A;padding-left:10px;">🔧 Mantenciones Próximas (${alertMaints.length})</h3>
    <div style="overflow-x:auto;margin-bottom:28px;"><table style="width:100%;border-collapse:collapse;min-width:480px;">
      <thead><tr><th style="${thStyle}">Tipo</th><th style="${thStyle}">Vehículo</th><th style="${thStyle}">Fecha</th><th style="${thStyle}">Conductor</th><th style="${thStyle}">Estado</th></tr></thead>
      <tbody>${maintRows}</tbody></table></div>` : ""}
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;">
      <p style="margin:0;color:#9a3412;font-size:13px;">Ingresa a <strong>Flotapp</strong> para gestionar estas alertas.</p>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Pares y Alvarez — Sistema de Gestión de Flota</p>
  </div>
</div></body></html>`;

  let sent = 0;
  for (const config of configs) {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: config.email,
      subject: `🔔 [PRUEBA] Flotapp — ${total} alerta(s) de la flota`,
      html,
    });
    if (!error) sent++;
  }

  await supabase.from("notification_log").insert({
    type: "email",
    recipient: configs.map((c) => c.email).join(", "),
    subject: `Prueba — ${total} alertas`,
    status: sent > 0 ? "sent" : "failed",
  });

  return NextResponse.json({
    ok: true,
    sent,
    docs: alertDocs.length,
    drivers: alertDrivers.length,
    maintenances: alertMaints.length,
  });
}
