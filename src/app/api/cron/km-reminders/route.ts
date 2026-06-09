import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://appcamioneta-sable.vercel.app";
const STALE_DAYS = 7; // días sin reportar para considerarse atrasado

function daysSince(dateStr: string): number {
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" }) + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

/** Envío WhatsApp vía Twilio — solo se ejecuta si las credenciales están configuradas. */
async function sendWhatsApp(toPhone: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // ej: "whatsapp:+14155238886"
  if (!sid || !token || !from || !toPhone) return false;

  const normalized = toPhone.replace(/\s+/g, "");
  const to = normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function driverReminderHtml(driverName: string, vehicleLabel: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:#1A1A2E;padding:24px 32px;">
    <p style="margin:0;color:white;font-size:20px;font-weight:bold;">🚛 ConstruservAPP</p>
  </div>
  <div style="padding:32px;text-align:center;">
    <p style="margin:0 0 8px;color:#374151;font-size:16px;">Hola <strong>${driverName}</strong>,</p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      Necesitamos que registres el kilometraje actual de tu vehículo
      <strong>${vehicleLabel}</strong>. Solo toma 5 segundos.
    </p>
    <a href="${APP_URL}/dashboard/registrar-km"
       style="display:inline-block;background:#E8500A;color:white;text-decoration:none;padding:16px 32px;border-radius:12px;font-size:17px;font-weight:bold;">
      📋 Registrar kilometraje
    </a>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">
      Toca el botón, escribe los km que marca tu vehículo y listo.
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Construserv Ltda. — Sistema de Gestión de Flota</p>
  </div>
</div></body></html>`;
}

function adminDigestHtml(rows: { driver: string; vehicle: string; days: number | null }[]): string {
  const trs = rows.map((r) => `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${r.driver}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${r.vehicle}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:600;color:#dc2626;">
      ${r.days === null ? "Nunca ha reportado" : `${r.days} días sin reportar`}
    </td>
  </tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
<div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:#1A1A2E;padding:24px 32px;">
    <p style="margin:0;color:white;font-size:20px;font-weight:bold;">🔔 ConstruservAPP</p>
    <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Conductores con kilometraje atrasado</p>
  </div>
  <div style="padding:32px;">
    <p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Los siguientes conductores llevan <strong>${STALE_DAYS} días o más</strong> sin registrar el kilometraje de su vehículo:
    </p>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;">Conductor</th>
        <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;">Vehículo</th>
        <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;">Estado</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin-top:24px;">
      <p style="margin:0;color:#9a3412;font-size:13px;">
        Contacta a estos conductores para que registren su kilometraje y mantener el seguimiento de mantenciones al día.
      </p>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Construserv Ltda. — Sistema de Gestión de Flota</p>
  </div>
</div></body></html>`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Conductores activos vinculados a una cuenta
  const { data: linkedDrivers } = await supabase
    .from("vehicle_drivers")
    .select("driver_name, driver_phone, profile_id, vehicle:vehicles(id, brand, model, plate), profile:profiles(email)")
    .is("end_date", null)
    .not("profile_id", "is", null);

  let emailsSent = 0;
  let whatsappSent = 0;
  const nonCompliant: { driver: string; vehicle: string; days: number | null }[] = [];

  for (const ld of linkedDrivers ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const veh = ld.vehicle as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = ld.profile as any;
    if (!veh) continue;

    const { data: lastReading } = await supabase
      .from("odometer_readings")
      .select("reading_date")
      .eq("vehicle_id", veh.id)
      .order("reading_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const days = lastReading ? daysSince(lastReading.reading_date) : null;
    const isStale = days === null || days >= STALE_DAYS;
    if (!isStale) continue;

    const vehicleLabel = `${veh.brand} ${veh.model} (${veh.plate})`;
    nonCompliant.push({ driver: ld.driver_name, vehicle: vehicleLabel, days });

    // Email al conductor
    if (profile?.email) {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM!,
        to: profile.email,
        subject: `🚛 Registra el kilometraje de tu ${veh.brand} ${veh.model}`,
        html: driverReminderHtml(ld.driver_name, vehicleLabel),
      });
      if (!error) emailsSent++;
    }

    // WhatsApp al conductor (si Twilio está configurado)
    if (ld.driver_phone) {
      const ok = await sendWhatsApp(
        ld.driver_phone,
        `🚛 Hola ${ld.driver_name}, registra el kilometraje de tu ${vehicleLabel}: ${APP_URL}/dashboard/registrar-km`
      );
      if (ok) whatsappSent++;
    }
  }

  // Aviso a administradores con la lista de incumplidores
  if (nonCompliant.length > 0) {
    const { data: admins } = await supabase
      .from("notification_configs")
      .select("email")
      .eq("is_active", true)
      .not("user_id", "is", null);

    for (const admin of admins ?? []) {
      await resend.emails.send({
        from: process.env.RESEND_FROM!,
        to: admin.email,
        subject: `🔔 ${nonCompliant.length} conductor(es) con kilometraje atrasado`,
        html: adminDigestHtml(nonCompliant),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    emailsSent,
    whatsappSent,
    nonCompliant: nonCompliant.length,
  });
}
