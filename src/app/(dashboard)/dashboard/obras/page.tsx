import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { HardHat, Plus, MapPin, ChevronRight } from "lucide-react";

export const metadata = { title: "Obras" };

export default async function ObrasPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: assignments }] = await Promise.all([
    supabase.from("projects").select("*").order("status").order("created_at", { ascending: false }),
    supabase.from("project_vehicles").select("project_id, end_date"),
  ]);

  const activeCount: Record<string, number> = {};
  for (const a of assignments ?? []) {
    if (!a.end_date) activeCount[a.project_id] = (activeCount[a.project_id] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Obras / Faenas</h2>
          <p className="text-gray-500 text-sm mt-1">{(projects ?? []).length} obra(s) registradas</p>
        </div>
        <Link href="/dashboard/obras/nueva" className="flex items-center gap-2 bg-construserv-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
          <Plus className="w-4 h-4" /> Nueva obra
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <HardHat className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">Aún no hay obras registradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/obras/${p.id}`} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${p.status === "activa" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.status === "activa" ? "Activa" : "Finalizada"}
                  </span>
                </div>
                {p.client && <p className="text-sm text-gray-500 mt-0.5">{p.client}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {p.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.location}</span>}
                  <span>{activeCount[p.id] ?? 0} vehículo(s)</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
