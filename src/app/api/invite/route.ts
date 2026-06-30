import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Verificar que el solicitante es admin
  const supabaseUser = await createServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabaseUser.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const body = await request.json();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Establecer / restablecer contraseña de un usuario existente ──
  if (body.action === "set_password") {
    const { user_id, password } = body;
    if (!user_id || !password || String(password).length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password,
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  // ── Crear usuario ──
  const { email, full_name, role, password } = body;

  // Con contraseña: el usuario queda listo para entrar de inmediato
  if (password) {
    if (String(password).length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Asegurar el perfil con nombre y rol correctos
    if (created.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: created.user.id,
        email,
        full_name,
        role,
      });
    }
    return NextResponse.json({ success: true, mode: "password" });
  }

  // Sin contraseña: enviar invitación por correo (comportamiento previo)
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true, mode: "invite" });
}
