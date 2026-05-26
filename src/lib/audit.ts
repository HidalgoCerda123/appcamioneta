import { createClient } from "@/lib/supabase/server";

type AuditAction = "create" | "update" | "delete";
type AuditEntity = "vehicle" | "maintenance" | "document" | "driver" | "user";

interface AuditEntry {
  action: AuditAction;
  entity: AuditEntity;
  entity_id?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra una acción en el log de auditoría.
 * Falla silenciosamente para no interrumpir la operación principal.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase.from("audit_log").insert({
      user_id: user.id,
      user_name: profile?.full_name ?? user.email ?? "Desconocido",
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id ?? null,
      description: entry.description,
      metadata: entry.metadata ?? null,
    });
  } catch {
    // No interrumpir la operación principal si el log falla
  }
}
