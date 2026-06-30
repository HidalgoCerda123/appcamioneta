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

export async function POST(req: NextRequest) {
  // Verificar API key interna para evitar llamadas no autorizadas
  const auth = req.headers.get("x-api-key");
  if (auth !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Leer configuración de notificaciones
  const { data: config } = await supabase
    .from("notification_configs")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!config?.email_to) {
    return NextResponse.json({ error: "Sin configuración activa" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

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

  const alertDocs = (docs ?? []).filter((d) => daysUntil(d.expiry_date) <= 30);
  const alertDrivers = (drivers ?? []).filter((d) => daysUntil(d.license_expiry) <= 30);

  if (alertDocs.length === 0 && alertDrivers.length === 0) {
    return NextResponse.json({ message: "Sin alertas pendientes" });
  }

  // Construir HTML del email
  const docRows = alertDocs
    .map((d) => {
      const days = daysUntil(d.expiry_date);
      const { text, color } = urgencyLabel(days);
      const veh = d.vehicle as { brand: string; model: string; plate: string } | null;
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.label}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.expiry_date}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;color:${color};">${text}</td>
        </tr>`;
    })
    .join("");

  const driverRows = alertDrivers
    .map((d) => {
      const days = daysUntil(d.license_expiry);
      const { text, color } = urgencyLabel(days);
      const veh = d.vehicle as { brand: string; model: string; plate: string } | null;
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.driver_name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "—"}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.license_expiry}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;color:${color};">${text}</td>
        </tr>`;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

    <!-- Header -->
    <div style="background:#1A1A2E;padding:24px 32px;display:flex;align-items:center;gap:16px;">
      <div style="background:#E8500A;border-radius:8px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:20px;">🔔</span>
      </div>
      <div>
        <p style="margin:0;color:white;font-size:18px;font-weight:bold;">Flotapp</p>
        <p style="margin:0;color:#9ca3af;font-size:13px;">Alertas de vencimiento</p>
      </div>
    </div>

    <div style="padding:32px;">
      <p style="margin:0 0 24px;color:#374151;font-size:15px;">
        A continuación el resumen de documentos y licencias por vencer en los próximos <strong>30 días</strong>:
      </p>

      ${alertDocs.length > 0 ? `
      <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;">📄 Documentos de Vehículos (${alertDocs.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Documento</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Vehículo</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Vencimiento</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Estado</th>
          </tr>
        </thead>
        <tbody>${docRows}</tbody>
      </table>` : ""}

      ${alertDrivers.length > 0 ? `
      <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;">👷 Licencias de Conductores (${alertDrivers.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Conductor</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Vehículo</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Vencimiento</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Estado</th>
          </tr>
        </thead>
        <tbody>${driverRows}</tbody>
      </table>` : ""}

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin-top:8px;">
        <p style="margin:0;color:#9a3412;font-size:13px;">
          Ingresa a <strong>Flotapp</strong> para gestionar estos documentos y mantener tu flota al día.
        </p>
      </div>
    </div>

    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Pares y Alvarez — Sistema de Gestión de Flota</p>
    </div>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: config.email_to,
    subject: `🔔 Flotapp — ${alertDocs.length + alertDrivers.length} alerta(s) de vencimiento`,
    html,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Registrar envío
  await supabase.from("notification_log").insert({
    type: "email",
    recipient: config.email_to,
    subject: `Alertas de vencimiento — ${alertDocs.length + alertDrivers.length} items`,
    status: "sent",
  });

  return NextResponse.json({
    ok: true,
    sent_to: config.email_to,
    docs: alertDocs.length,
    drivers: alertDrivers.length,
  });
}

// GET — para prueba manual desde la página de notificaciones
export async function GET(req: NextRequest) {
  return POST(req);
}
