"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface Props {
  vehicles: Vehicle[];
}

const LICENSE_TYPES = [
  { value: "A1", label: "A1 — Motocicletas hasta 50cc" },
  { value: "A2", label: "A2 — Motocicletas sobre 50cc" },
  { value: "A3", label: "A3 — Triciclos y cuadriciclos" },
  { value: "A4", label: "A4 — Vehículos especiales menores" },
  { value: "B",  label: "B — Automóviles y camionetas hasta 3.500 kg" },
  { value: "C",  label: "C — Camiones y vehículos sobre 3.500 kg" },
  { value: "D",  label: "D — Buses y minibuses" },
  { value: "E",  label: "E — Maquinaria pesada" },
];

export default function DriverForm({ vehicles }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    vehicle_id: "",
    driver_name: "",
    driver_rut: "",
    driver_phone: "",
    driver_license: "",
    license_type: "",
    license_expiry: "",
    start_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.vehicle_id) { setError("Debes seleccionar un vehículo."); return; }
    if (!form.driver_name.trim()) { setError("El nombre del conductor es obligatorio."); return; }
    if (!form.start_date) { setError("La fecha de inicio es obligatoria."); return; }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sesión expirada. Recarga la página."); setLoading(false); return; }

    const payload: Record<string, string | null> = {
      vehicle_id: form.vehicle_id,
      driver_name: form.driver_name.trim(),
      driver_rut: form.driver_rut.trim() || null,
      driver_phone: form.driver_phone.trim() || null,
      driver_license: form.driver_license.trim() || null,
      license_type: form.license_type || null,
      license_expiry: form.license_expiry || null,
      start_date: form.start_date,
      notes: form.notes.trim() || null,
      created_by: user.id,
    };

    const { data, error: dbError } = await supabase
      .from("vehicle_drivers")
      .insert(payload)
      .select("id")
      .single();

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/conductores/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Vehículo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Asignación de Vehículo</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vehículo <span className="text-red-500">*</span>
          </label>
          <select
            value={form.vehicle_id}
            onChange={(e) => set("vehicle_id", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
          >
            <option value="">Selecciona un vehículo...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} — {v.plate}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de inicio <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
          />
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Datos del Conductor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.driver_name}
              onChange={(e) => set("driver_name", e.target.value)}
              placeholder="Ej: Juan Pérez González"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
            <input
              type="text"
              value={form.driver_rut}
              onChange={(e) => set("driver_rut", e.target.value)}
              placeholder="Ej: 12.345.678-9"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.driver_phone}
              onChange={(e) => set("driver_phone", e.target.value)}
              placeholder="Ej: +56 9 1234 5678"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
            />
          </div>
        </div>
      </div>

      {/* Licencia */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Licencia de Conducir</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° Licencia</label>
            <input
              type="text"
              value={form.driver_license}
              onChange={(e) => set("driver_license", e.target.value)}
              placeholder="Número de licencia"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={form.license_type}
              onChange={(e) => set("license_type", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
            >
              <option value="">Sin especificar</option>
              {LICENSE_TYPES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
            <input
              type="date"
              value={form.license_expiry}
              onChange={(e) => set("license_expiry", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
            />
          </div>
        </div>
      </div>

      {/* Notas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Observaciones adicionales sobre el conductor..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange resize-none"
        />
      </div>

      {/* Acciones */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-construserv-orange rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar conductor"}
        </button>
      </div>
    </form>
  );
}
