import { createClient } from "@/lib/supabase/server";
import NotificationsConfig from "@/components/notifications/NotificationsConfig";

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: config } = await supabase
    .from("notification_configs")
    .select("*")
    .single();

  const { data: logs } = await supabase
    .from("notification_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return <NotificationsConfig initialConfig={config} logs={logs ?? []} />;
}
