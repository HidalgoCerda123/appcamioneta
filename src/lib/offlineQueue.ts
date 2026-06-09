// Cola de registros pendientes cuando no hay señal (se reintentan al reconectar).
import { createClient } from "@/lib/supabase/client";

const KEY = "construserv_pending_v1";

export interface QueuedItem {
  id: string;
  action: "odometer";
  payload: Record<string, unknown>;
  dedupe?: string; // evita duplicados (ej: un km por vehículo+día)
  createdAt: number;
}

export function readQueue(): QueuedItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueue(item: Omit<QueuedItem, "id" | "createdAt">): void {
  const queue = readQueue();
  if (item.dedupe && queue.some((q) => q.dedupe === item.dedupe)) return;
  queue.push({ ...item, id: Math.random().toString(36).slice(2), createdAt: Date.now() });
  writeQueue(queue);
}

export function queueCount(): number {
  return readQueue().length;
}

let flushing = false;

/** Reintenta enviar los pendientes. Devuelve cuántos se enviaron. */
export async function flushQueue(): Promise<number> {
  if (flushing || typeof window === "undefined") return 0;
  const queue = readQueue();
  if (queue.length === 0) return 0;
  flushing = true;
  const supabase = createClient();
  const remaining: QueuedItem[] = [];
  let sent = 0;

  try {
    for (const item of queue) {
      try {
        if (item.action === "odometer") {
          const p = item.payload as { vehicle_id: string; km: number };
          const { error } = await supabase.from("odometer_readings").insert(item.payload);
          if (error) { remaining.push(item); continue; }
          // Actualizar km del vehículo si corresponde
          const { data: veh } = await supabase.from("vehicles").select("current_km").eq("id", p.vehicle_id).single();
          if (veh && p.km >= veh.current_km) {
            await supabase.from("vehicles").update({ current_km: p.km }).eq("id", p.vehicle_id);
          }
          sent++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
  } finally {
    writeQueue(remaining);
    flushing = false;
  }
  return sent;
}
