import { NextRequest, NextResponse } from "next/server";
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

function urgencyLabel(days: number) {
  if (days < 0) return { text: "VENCIDO", color: "#dc2626" };
  if (days <= 7) return { text: `Vence en ${days} días`, color: "#dc2626" };
  if (days <= 15) return { text: `Vence en ${days} días`, color: "#d97706" };
  return { text: `Vence en ${days} días`, color: "#16a34a" };
}

export async function GET(req: NextRequest) {
  // Verificar que la llamada viene de Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Obtener todos los destinatarios configurados
  const { data: prefs } = await supabase
    .from("user_notification_prefs")
    .select("*")
    .not("email", "is", null);

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ message: "Sin destinatarios configurados" });
  }

  // Documentos por vencer
  const { data: docs } = await supabase
    .from("vehicle_documents")
    .select("*, vehicle:vehicles(brand, model, plate)")
    .lte("expiry_date", in30)
    .order("expiry_date");

  // Licencias de conductores activos por vencer
  const { data: drivers } = await supabase
    .from("vehicle_drivers")
    .select("*, vehicle:vehicles(brand, model, plate)")
    .is("end_date", null)
    .not("license_expiry", "is", null)
    .lte("license_expiry", in30)
    .order("license_expiry");

  // Mantenciones por fecha próxima
  const { data: maintByDate } = await supabase
    .from("maintenances")
    .select("*, vehicle:vehicles(brand, model, plate)")
    .not("next_service_date", "is", null)
    .lte("next_service_date", in30)
    .order("next_service_date");

  const alertDocs = (docs ?? []).filter((d) => daysUntil(d.expiry_date) <= 30);
  const alertDrivers = (drivers ?? []).filter((d) => daysUntil(d.license_expiry) <= 30);
  const alertMaint = (maintByDate ?? []).filter((m) => m.next_service_date && daysUntil(m.next_service_date) <= 30);

  if (alertDocs.length === 0 && alertDrivers.length === 0 && alertMaint.length === 0) {
    return NextResponse.json({ message: "Sin alertas pendientes" });
  }

  const typeLabels: Record<string, string> = {
    aceite: "Aceite", frenos: "Frenos", neumaticos: "Neumáticos",
    filtros: "Filtros", suspension: "Suspensión", electrico: "Eléctrico",
    general: "General", otro: "Otro",
  };

  let sent = 0;

  for (const pref of prefs) {
    if (!pref.email) continue;

    const showDocs = pref.notify_doc_expiry !== false;
    const showLicense = pref.notify_license_expiry !== false;
    const showMaint = pref.notify_maintenance !== false;

    const myDocs = showDocs ? alertDocs : [];
    const myDrivers = showLicense ? alertDrivers : [];
    const myMaint = showMaint ? alertMaint : [];

    if (myDocs.length === 0 && myDrivers.length === 0 && myMaint.length === 0) continue;

    const docRows = myDocs.map((d) => {
      const days = daysUntil(d.expiry_date);
      const { text, color } = urgencyLabel(days);
      const veh = d.vehicle as { brand: string; model: string; plate: string } | null;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.label}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.expiry_date}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;color:${color};">${text}</td>
      </tr>`;
    }).join("");

    const driverRows = myDrivers.map((d) => {
      const days = daysUntil(d.license_expiry);
      const { text, color } = urgencyLabel(days);
      const veh = d.vehicle as { brand: string; model: string; plate: string } | null;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.driver_name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.license_expiry}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;color:${color};">${text}</td>
      </tr>`;
    }).join("");

    const maintRows = myMaint.map((m) => {
      const days = daysUntil(m.next_service_date);
      const { text, color } = urgencyLabel(days);
      const veh = m.vehicle as { brand: string; model: string; plate: string } | null;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${typeLabels[m.type] ?? m.type}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${m.next_service_date}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;color:${color};">${text}</td>
      </tr>`;
    }).join("");

    const total = myDocs.length + myDrivers.length + myMaint.length;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#1A1A2E;padding:24px 32px;">
      <p style="margin:0;color:white;font-size:18px;font-weight:bold;">🔔 ConstruservAPP</p>
      <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Resumen diario de alertas — ${new Date().toLocaleDateString("es-CL")}</p>
    </div>
    <div style="padding:32px;">
      ${myDocs.length > 0 ? `
      <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;">📄 Documentos por Vencer (${myDocs.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
        <thead><tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Documento</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Vehículo</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Vencimiento</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Estado</th>
        </tr></thead>
        <tbody>${docRows}</tbody>
      </table>` : ""}
      ${myDrivers.length > 0 ? `
      <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;">👷 Licencias de Conductores (${myDrivers.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
        <thead><tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Conductor</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Vehículo</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Vencimiento</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Estado</th>
        </tr></thead>
        <tbody>${driverRows}</tbody>
      </table>` : ""}
      ${myMaint.length > 0 ? `
      <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;">🔧 Mantenciones Próximas (${myMaint.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
        <thead><tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Tipo</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Vehículo</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Fecha</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;">Estado</th>
        </tr></thead>
        <tbody>${maintRows}</tbody>
      </table>` : ""}
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;">
        <p style="margin:0;color:#9a3412;font-size:13px;">Ingresa a <strong>ConstruservAPP</strong> para gestionar estos items.</p>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Construserv Ltda. — Sistema de Gestión de Flota</p>
    </div>
  </div>
</body></html>`;

    await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: pref.email,
      subject: `🔔 ConstruservAPP — ${total} alerta(s) de vencimiento`,
      html,
    });
    sent++;
  }

  await supabase.from("notification_log").insert({
    type: "cron",
    recipient: `${sent} destinatarios`,
    subject: `Cron diario — ${alertDocs.length + alertDrivers.length + alertMaint.length} alertas`,
    status: "sent",
  });

  return NextResponse.json({ ok: true, sent, alerts: alertDocs.length + alertDrivers.length + alertMaint.length });
}
