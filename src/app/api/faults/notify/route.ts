import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://appcamioneta-sable.vercel.app";

const SEV_LABEL: Record<string, { text: string; color: string }> = {
  alta: { text: "ALTA — Urgente", color: "#dc2626" },
  media: { text: "Media", color: "#d97706" },
  baja: { text: "Baja", color: "#6b7280" },
};

export async function POST(req: Request) {
  let faultId: string | null = null;
  try {
    const body = await req.json();
    faultId = body?.fault_id ?? null;
  } catch { /* ignore */ }
  if (!faultId) return NextResponse.json({ error: "Sin fault_id" }, { status: 400 });

  const { data: fault } = await supabase
    .from("fault_reports")
    .select("*, vehicle:vehicles(brand, model, plate)")
    .eq("id", faultId)
    .single();

  if (!fault) return NextResponse.json({ error: "Falla no encontrada" }, { status: 404 });

  const { data: admins } = await supabase
    .from("notification_configs")
    .select("email")
    .eq("is_active", true)
    .not("user_id", "is", null);

  if (!admins || admins.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const veh = fault.vehicle as any;
  const vehicleLabel = veh ? `${veh.brand} ${veh.model} (${veh.plate})` : "Vehículo";
  const sev = SEV_LABEL[fault.severity] ?? SEV_LABEL.media;
  const photos = (fault.photo_urls ?? []) as string[];

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:#1A1A2E;padding:24px 32px;">
    <p style="margin:0;color:white;font-size:20px;font-weight:bold;">⚠️ Falla reportada</p>
    <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">${vehicleLabel}</p>
  </div>
  <div style="padding:32px;">
    <p style="margin:0 0 6px;color:#111827;font-size:17px;font-weight:bold;">${fault.title}</p>
    <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:${sev.color};">Gravedad: ${sev.text}</p>
    ${fault.description ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;">${fault.description}</p>` : ""}
    ${fault.driver_name ? `<p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Reportada por: <strong>${fault.driver_name}</strong></p>` : ""}
    ${photos.length > 0 ? `<div style="margin:0 0 16px;">${photos.map((u) => `<a href="${u}"><img src="${u}" alt="" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;margin:0 6px 6px 0;" /></a>`).join("")}</div>` : ""}
    <a href="${APP_URL}/dashboard/fallas" style="display:inline-block;background:#E8500A;color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:bold;">Ver en Flotapp</a>
  </div>
  <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Pares y Alvarez — Sistema de Gestión de Flota</p>
  </div>
</div></body></html>`;

  let sent = 0;
  for (const admin of admins) {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: admin.email,
      subject: `⚠️ Falla ${fault.severity === "alta" ? "URGENTE " : ""}reportada — ${vehicleLabel}`,
      html,
    });
    if (!error) sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
