export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import InviteUserForm from "@/components/users/InviteUserForm";
import UsersTable from "@/components/users/UsersTable";

export default async function UsersPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (currentProfile?.role !== "admin") redirect("/dashboard");

  const [{ data: profiles }, { data: customRoles }, { data: notifPrefs }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("custom_roles").select("id, name, base_role").order("name"),
    supabase.from("user_notification_prefs").select("*"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usuarios</h2>
          <p className="text-gray-500 text-sm mt-1">{profiles?.length ?? 0} usuarios registrados</p>
        </div>
      </div>

      {/* Invitar usuario */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-construserv-orange" />
          Invitar Nuevo Usuario
        </h3>
        <InviteUserForm customRoles={customRoles ?? []} />
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuarios del Sistema
          </h3>
        </div>
        <UsersTable
          profiles={profiles ?? []}
          currentUserId={user!.id}
          customRoles={customRoles ?? []}
          notifPrefs={notifPrefs ?? []}
        />
      </div>
    </div>
  );
}
