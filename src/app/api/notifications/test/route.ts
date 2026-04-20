import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
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

function fmtKm(km: number) {
  return km.toLocaleString("es-CL") + " km";
}

const thStyle = `padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:12px;background:#f3f4f6;`;
const tdStyle = `padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;vertical-align:top;`;

export async function POST(req: Request) {
  let emailTo: string | null = null;
  try {
    const body = await req.json();
    emailTo = body?.email_to ?? null;
  } catch { /* body vacío */ }

  if (!emailTo) {
    const { data: config } = await supabase
      .from("notification_configs")
      .select("email_to")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    emailTo = config?.email_to ?? null;
  }

  if (!emailTo) {
    return NextResponse.json({ error: "Sin email configurado" }, { status: 400 });
  }

  // Guardar/actualizar config en la BD usando service role (bypass RLS)
  const { data: existing } = await supabase
    .from("notification_configs")
    .select("id")
    .limit(1)
    .single();

  if (existing?.id) {
    await supabase.from("notification_configs").update({ email_to: emailTo }).eq("id", existing.id);
  } else {
    await supabase.from("notification_configs").insert({ email_to: emailTo, is_active: true });
  }

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Traer preferencias de notificación de todos los usuarios
  const { data: allUserPrefs } = await supabase
    .from("user_notification_prefs")
    .select("*")
    .not("email", "is", null);

  // Traer documentos, conductores activos con licencia por vencer, y mantenciones con próxima fecha
  const [{ data: rawDocs }, { data: rawDrivers }, { data: rawMaintenances }, { data: activeDrivers }] = await Promise.all([
    // Documentos de vehículos por vencer
    supabase
      .from("vehicle_documents")
      .select("*, vehicle:vehicles(id, brand, model, plate)")
      .lte("expiry_date", in30)
      .order("expiry_date"),

    // Licencias de conductores activos por vencer
    supabase
      .from("vehicle_drivers")
      .select("*, vehicle:vehicles(brand, model, plate)")
      .is("end_date", null)
      .not("license_expiry", "is", null)
      .lte("license_expiry", in30)
      .order("license_expiry"),

    // Mantenciones con próxima fecha sugerida en los próximos 30 días
    supabase
      .from("maintenances")
      .select("*, vehicle:vehicles(id, brand, model, plate, current_km)")
      .not("next_service_date", "is", null)
      .lte("next_service_date", in30)
      .gte("next_service_date", today)
      .order("next_service_date"),

    // Conductores activos por vehiculo (para incluir en docs)
    supabase
      .from("vehicle_drivers")
      .select("vehicle_id, driver_name")
      .is("end_date", null),
  ]);

  // Construir mapa vehicle_id → conductor activo
  const driverMap: Record<string, string> = {};
  for (const d of activeDrivers ?? []) {
    driverMap[d.vehicle_id] = d.driver_name;
  }

  const alertDocs = (rawDocs ?? []).filter((d) => daysUntil(d.expiry_date) <= 30);
  const alertDrivers = (rawDrivers ?? []).filter((d) => daysUntil(d.license_expiry) <= 30);

  // Mantenciones por fecha próxima sugerida
  const alertMaintenancesDate = rawMaintenances ?? [];

  // Mantenciones cuyo próximo km ya fue superado o está cerca (dentro de 2000 km)
  const { data: rawMaintKm } = await supabase
    .from("maintenances")
    .select("*, vehicle:vehicles(id, brand, model, plate, current_km)")
    .not("next_service_km", "is", null);

  const alertMaintenancesKm = (rawMaintKm ?? []).filter((m) => {
    const veh = m.vehicle as { current_km: number } | null;
    if (!veh) return false;
    const diff = m.next_service_km - veh.current_km;
    return diff <= 2000; // faltan 2000 km o menos (o ya superado)
  });

  const totalAlerts = alertDocs.length + alertDrivers.length + alertMaintenancesDate.length + alertMaintenancesKm.length;

  if (totalAlerts === 0) {
    return NextResponse.json({
      ok: true,
      message: "Sin alertas — no hay vencimientos ni mantenciones pendientes en los próximos 30 días",
      sent_to: emailTo,
      docs: 0,
      drivers: 0,
      maintenances: 0,
    });
  }

  // ─── Filas documentos ───
  const docRows = alertDocs.map((d) => {
    const days = daysUntil(d.expiry_date);
    const veh = d.vehicle as { id: string; brand: string; model: string; plate: string } | null;
    const conductor = veh ? (driverMap[veh.id] ?? "Sin conductor") : "—";
    return `<tr>
      <td style="${tdStyle}">${d.label}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model}<br><span style="color:#9ca3af;font-size:11px;">${veh.plate}</span>` : "—"}</td>
      <td style="${tdStyle}">${fmtDate(d.expiry_date)}</td>
      <td style="${tdStyle}">${conductor}</td>
      <td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td>
    </tr>`;
  }).join("");

  // ─── Filas licencias conductores ───
  const driverRows = alertDrivers.map((d) => {
    const days = daysUntil(d.license_expiry);
    const veh = d.vehicle as { brand: string; model: string; plate: string } | null;
    return `<tr>
      <td style="${tdStyle}">${d.driver_name}${d.license_type ? `<br><span style="color:#9ca3af;font-size:11px;">Lic. ${d.license_type}</span>` : ""}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model}<br><span style="color:#9ca3af;font-size:11px;">${veh.plate}</span>` : "—"}</td>
      <td style="${tdStyle}">${fmtDate(d.license_expiry)}</td>
      <td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td>
    </tr>`;
  }).join("");

  // ─── Filas mantenciones por fecha ───
  const maintDateRows = alertMaintenancesDate.map((m) => {
    const days = daysUntil(m.next_service_date);
    const veh = m.vehicle as { brand: string; model: string; plate: string; current_km: number } | null;
    const conductor = veh ? (driverMap[(m.vehicle as { id: string }).id] ?? "Sin conductor") : "—";
    return `<tr>
      <td style="${tdStyle}">${m.type}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model}<br><span style="color:#9ca3af;font-size:11px;">${veh.plate}</span>` : "—"}</td>
      <td style="${tdStyle}">${m.workshop_name}</td>
      <td style="${tdStyle}">${fmtDate(m.next_service_date)}</td>
      <td style="${tdStyle}">${conductor}</td>
      <td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td>
    </tr>`;
  }).join("");

  // ─── Filas mantenciones por km ───
  const maintKmRows = alertMaintenancesKm.map((m) => {
    const veh = m.vehicle as { id: string; brand: string; model: string; plate: string; current_km: number } | null;
    const diff = m.next_service_km - (veh?.current_km ?? 0);
    const conductor = veh ? (driverMap[veh.id] ?? "Sin conductor") : "—";
    const color = diff <= 0 ? "#dc2626" : diff <= 500 ? "#dc2626" : "#d97706";
    const statusText = diff <= 0 ? `SUPERADO por ${Math.abs(diff).toLocaleString("es-CL")} km` : `Faltan ${diff.toLocaleString("es-CL")} km`;
    return `<tr>
      <td style="${tdStyle}">${m.type}</td>
      <td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model}<br><span style="color:#9ca3af;font-size:11px;">${veh.plate}</span>` : "—"}</td>
      <td style="${tdStyle}">${m.workshop_name}</td>
      <td style="${tdStyle}">${fmtKm(m.next_service_km)}<br><span style="color:#9ca3af;font-size:11px;">Actual: ${fmtKm(veh?.current_km ?? 0)}</span></td>
      <td style="${tdStyle}">${conductor}</td>
      <td style="${tdStyle}font-weight:600;color:${color};">${statusText}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
<div style="max-width:700px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

  <!-- Header -->
  <div style="background:#1A1A2E;padding:24px 32px;">
    <p style="margin:0;color:white;font-size:20px;font-weight:bold;">🔔 ConstruservAPP</p>
    <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Alertas de flota — ${new Date().toLocaleDateString("es-CL", { dateStyle: "long" })}</p>
  </div>

  <div style="padding:32px;">
    <p style="margin:0 0 28px;color:#374151;font-size:15px;">
      Resumen de <strong>${totalAlerts} alerta(s)</strong> que requieren atención:
    </p>

    <!-- DOCUMENTOS -->
    ${alertDocs.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #3b82f6;padding-left:10px;">📄 Documentos por Vencer (${alertDocs.length})</h3>
    <div style="overflow-x:auto;margin-bottom:32px;">
    <table style="width:100%;border-collapse:collapse;min-width:500px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="${thStyle}">Documento</th>
        <th style="${thStyle}">Vehículo</th>
        <th style="${thStyle}">Fecha Venc.</th>
        <th style="${thStyle}">Conductor</th>
        <th style="${thStyle}">Estado</th>
      </tr></thead>
      <tbody>${docRows}</tbody>
    </table></div>` : ""}

    <!-- LICENCIAS -->
    ${alertDrivers.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #8b5cf6;padding-left:10px;">👷 Licencias de Conductores (${alertDrivers.length})</h3>
    <div style="overflow-x:auto;margin-bottom:32px;">
    <table style="width:100%;border-collapse:collapse;min-width:400px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="${thStyle}">Conductor</th>
        <th style="${thStyle}">Vehículo Asignado</th>
        <th style="${thStyle}">Vence Licencia</th>
        <th style="${thStyle}">Estado</th>
      </tr></thead>
      <tbody>${driverRows}</tbody>
    </table></div>` : ""}

    <!-- MANTENCIONES POR FECHA -->
    ${alertMaintenancesDate.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #E8500A;padding-left:10px;">🔧 Mantenciones Sugeridas por Fecha (${alertMaintenancesDate.length})</h3>
    <div style="overflow-x:auto;margin-bottom:32px;">
    <table style="width:100%;border-collapse:collapse;min-width:500px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="${thStyle}">Tipo</th>
        <th style="${thStyle}">Vehículo</th>
        <th style="${thStyle}">Taller</th>
        <th style="${thStyle}">Fecha Sugerida</th>
        <th style="${thStyle}">Conductor</th>
        <th style="${thStyle}">Estado</th>
      </tr></thead>
      <tbody>${maintDateRows}</tbody>
    </table></div>` : ""}

    <!-- MANTENCIONES POR KM -->
    ${alertMaintenancesKm.length > 0 ? `
    <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #f59e0b;padding-left:10px;">⚙️ Mantenciones por Kilometraje (${alertMaintenancesKm.length})</h3>
    <div style="overflow-x:auto;margin-bottom:32px;">
    <table style="width:100%;border-collapse:collapse;min-width:500px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="${thStyle}">Tipo</th>
        <th style="${thStyle}">Vehículo</th>
        <th style="${thStyle}">Taller</th>
        <th style="${thStyle}">Km Sugerido / Actual</th>
        <th style="${thStyle}">Conductor</th>
        <th style="${thStyle}">Estado</th>
      </tr></thead>
      <tbody>${maintKmRows}</tbody>
    </table></div>` : ""}

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;">
      <p style="margin:0;color:#9a3412;font-size:13px;">Ingresa a <strong>ConstruservAPP</strong> para gestionar estas alertas y mantener tu flota al día.</p>
    </div>
  </div>

  <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Construserv Ltda. — Sistema de Gestión de Flota</p>
  </div>
</div>
</body></html>`;

  // --- Envío principal (admin / config global) ---
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: emailTo,
    subject: `🔔 ConstruservAPP — ${totalAlerts} alerta(s) de flota`,
    html,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("notification_log").insert({
    type: "email",
    recipient: emailTo,
    subject: `Alertas de flota — ${totalAlerts} items`,
    status: "sent",
  });

  // --- Envío personalizado a usuarios con preferencias configuradas ---
  const extraRecipients = (allUserPrefs ?? []).filter((p) => p.email && p.email !== emailTo);

  for (const pref of extraRecipients) {
    // Determinar si este usuario es un conductor activo con vehículo asignado
    const driverRecord = (rawDrivers ?? []).find((d) => {
      // Buscar coincidencia por user_id en vehicle_drivers (si existe)
      return false; // placeholder — vehicle_drivers no tiene user_id directo aún
    });
    const assignedVehicleId: string | null = null; // Para futura integración conductor-usuario

    // Filtrar alertas según preferencias
    let userDocs   = pref.notify_doc_expiry     ? alertDocs          : [];
    let userMaintD = pref.notify_maintenance     ? alertMaintenancesDate : [];
    let userMaintK = pref.notify_maintenance     ? alertMaintenancesKm  : [];
    let userDrivers = pref.notify_license_expiry ? alertDrivers       : [];

    // Si "solo su vehículo" está activo y tiene vehículo asignado, filtrar
    if (pref.notify_own_vehicle_only && assignedVehicleId) {
      userDocs    = userDocs.filter((d) => (d.vehicle as { id: string } | null)?.id === assignedVehicleId);
      userMaintD  = userMaintD.filter((m) => (m.vehicle as { id: string } | null)?.id === assignedVehicleId);
      userMaintK  = userMaintK.filter((m) => (m.vehicle as { id: string } | null)?.id === assignedVehicleId);
      userDrivers = userDrivers.filter((d) => (d.vehicle as { id: string } | null)?.id === assignedVehicleId);
    }

    const userTotal = userDocs.length + userMaintD.length + userMaintK.length + userDrivers.length;
    if (userTotal === 0) continue;

    // Construir HTML personalizado (misma función, subset de datos)
    const uDocRows = userDocs.map((d) => {
      const days = daysUntil(d.expiry_date);
      const veh = d.vehicle as { id: string; brand: string; model: string; plate: string } | null;
      const conductor = veh ? (driverMap[veh.id] ?? "Sin conductor") : "—";
      return `<tr><td style="${tdStyle}">${d.label}</td><td style="${tdStyle}">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td><td style="${tdStyle}">${fmtDate(d.expiry_date)}</td><td style="${tdStyle}">${conductor}</td><td style="${tdStyle}font-weight:600;color:${urgencyColor(days)};">${urgencyText(days)}</td></tr>`;
    }).join("");

    const userHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
<div style="max-width:700px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
<div style="background:#1A1A2E;padding:24px 32px;">
  <p style="margin:0;color:white;font-size:20px;font-weight:bold;">🔔 ConstruservAPP</p>
  <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Alertas personalizadas — ${new Date().toLocaleDateString("es-CL", { dateStyle: "long" })}</p>
</div>
<div style="padding:32px;">
  <p style="margin:0 0 24px;color:#374151;font-size:15px;">Tienes <strong>${userTotal} alerta(s)</strong> que requieren atención:</p>
  ${uDocRows ? `<h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;border-left:4px solid #3b82f6;padding-left:10px;">📄 Documentos (${userDocs.length})</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
  <thead><tr style="background:#f3f4f6;"><th style="${thStyle}">Documento</th><th style="${thStyle}">Vehículo</th><th style="${thStyle}">Vencimiento</th><th style="${thStyle}">Conductor</th><th style="${thStyle}">Estado</th></tr></thead>
  <tbody>${uDocRows}</tbody></table>` : ""}
  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;"><p style="margin:0;color:#9a3412;font-size:13px;">Ingresa a <strong>ConstruservAPP</strong> para gestionar estas alertas.</p></div>
</div>
<div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;"><p style="margin:0;color:#9ca3af;font-size:12px;">Construserv Ltda.</p></div>
</div></body></html>`;

    const { error: userErr } = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: pref.email,
      subject: `🔔 ConstruservAPP — ${userTotal} alerta(s) para ti`,
      html: userHtml,
    });

    await supabase.from("notification_log").insert({
      type: "email",
      recipient: pref.email,
      subject: `Alertas personalizadas — ${userTotal} items`,
      status: userErr ? "error" : "sent",
    });
  }

  return NextResponse.json({
    ok: true,
    sent_to: emailTo,
    extra_recipients: extraRecipients.length,
    docs: alertDocs.length,
    drivers: alertDrivers.length,
    maintenances: alertMaintenancesDate.length + alertMaintenancesKm.length,
  });
}
