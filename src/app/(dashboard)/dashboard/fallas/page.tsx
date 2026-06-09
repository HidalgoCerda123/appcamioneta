import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Wrench, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import FaultStatusControl from "@/components/faults/FaultStatusControl";

export const metadata = { title: "Fallas" };

const SEV: Record<string, { label: string; class: string }> = {
  alta: { label: "Alta", class: "bg-red-100 text-red-700" },
  media: { label: "Media", class: "bg-yellow-100 text-yellow-700" },
  baja: { label: "Baja", class: "bg-gray-100 text-gray-600" },
};

const STATUS: Record<string, { label: string; class: string }> = {
  abierta: { label: "Abierta", class: "bg-red-100 text-red-700" },
  en_proceso: { label: "En proceso", class: "bg-yellow-100 text-yellow-700" },
  resuelta: { label: "Resuelta", class: "bg-green-100 text-green-700" },
};

export default async function FaultsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isManager = false;
  if (user) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isManager = prof?.role === "admin" || prof?.role === "editor";
  }

  let query = supabase
    .from("fault_reports")
    .select("*, vehicle:vehicles(id, brand, model, plate)")
    .order("created_at", { ascending: false });
  if (estado) query = query.eq("status", estado);

  const { data: faults } = await query;
  const openCount = (faults ?? []).filter((f) => f.status !== "resuelta").length;

  const filters = [
    { key: "", label: "Todas" },
    { key: "abierta", label: "Abiertas" },
    { key: "en_proceso", label: "En proceso" },
    { key: "resuelta", label: "Resueltas" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fallas</h2>
          <p className="text-gray-500 text-sm mt-1">{openCount} falla(s) sin resolver</p>
        </div>
        <Link href="/dashboard/fallas/nueva" className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
          <Plus className="w-4 h-4" />
          Reportar falla
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/dashboard/fallas?estado=${f.key}` : "/dashboard/fallas"}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              (estado ?? "") === f.key ? "bg-construserv-orange text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!faults || faults.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay fallas {estado ? "en este estado" : "registradas"}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {faults.map((f) => {
            const veh = f.vehicle as { id: string; brand: string; model: string; plate: string } | null;
            const sev = SEV[f.severity] ?? SEV.media;
            const st = STATUS[f.status] ?? STATUS.abierta;
            const photos = (f.photo_urls ?? []) as string[];
            return (
              <div key={f.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.class}`}>{sev.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.class}`}>{st.label}</span>
                    </div>
                    <p className="font-semibold text-gray-900 mt-2">{f.title}</p>
                    {f.description && <p className="text-sm text-gray-600 mt-1">{f.description}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      {veh ? (
                        <Link href={`/dashboard/vehiculos/${veh.id}`} className="hover:text-construserv-orange">
                          {veh.brand} {veh.model} ({veh.plate})
                        </Link>
                      ) : "—"}
                      {f.driver_name ? ` · ${f.driver_name}` : ""} · {formatDate(f.created_at)}
                    </p>
                    {photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {photos.map((u, i) => (
                          <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {isManager && (
                  <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-50 flex-wrap">
                    <FaultStatusControl faultId={f.id} status={f.status} />
                    {veh && (
                      <Link
                        href={`/dashboard/mantenciones/nueva?vehicle_id=${veh.id}`}
                        className="flex items-center gap-1.5 text-construserv-orange text-sm font-medium hover:underline"
                      >
                        <Wrench className="w-4 h-4" />
                        Convertir en mantención
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
