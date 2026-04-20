"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle, VehicleType, VehicleStatus } from "@/types";

interface Props {
  vehicle?: Vehicle;
}

export default function VehicleForm({ vehicle }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!vehicle;

  const [form, setForm] = useState({
    plate: vehicle?.plate ?? "",
    brand: vehicle?.brand ?? "",
    model: vehicle?.model ?? "",
    year: vehicle?.year ?? new Date().getFullYear(),
    type: (vehicle?.type ?? "camioneta") as VehicleType,
    status: (vehicle?.status ?? "activo") as VehicleStatus,
    vin: vehicle?.vin ?? "",
    color: vehicle?.color ?? "",
    current_km: vehicle?.current_km ?? 0,
    notes: vehicle?.notes ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "year" || name === "current_km" ? Number(value) : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let photo_url = vehicle?.photo_url;

    // Subir foto si hay nueva
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("vehicle-photos")
        .upload(fileName, photoFile);

      if (uploadError) {
        setError("Error al subir la foto: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("vehicle-photos")
        .getPublicUrl(uploadData.path);
      photo_url = urlData.publicUrl;
    }

    const payload = { ...form, photo_url };

    if (isEditing) {
      const { error } = await supabase
        .from("vehicles")
        .update(payload)
        .eq("id", vehicle.id);
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.from("vehicles").insert(payload);
      if (error) { setError(error.message); setLoading(false); return; }
    }

    router.push("/dashboard/vehiculos");
    router.refresh();
  }

  const inputClass =
    "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-construserv-orange focus:border-transparent transition text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Patente *</label>
          <input name="plate" value={form.plate} onChange={handleChange} required placeholder="ABCD12" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Marca *</label>
          <input name="brand" value={form.brand} onChange={handleChange} required placeholder="Toyota" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Modelo *</label>
          <input name="model" value={form.model} onChange={handleChange} required placeholder="Hilux" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Año *</label>
          <input name="year" type="number" value={form.year} onChange={handleChange} required min={1990} max={2030} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Tipo *</label>
          <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
            <option value="camioneta">Camioneta</option>
            <option value="camion">Camión</option>
            <option value="maquinaria_pesada">Maquinaria Pesada</option>
            <option value="furgon">Furgón</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Estado *</label>
          <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
            <option value="activo">Activo</option>
            <option value="en_mantencion">En Mantención</option>
            <option value="fuera_de_servicio">Fuera de Servicio</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Kilometraje Actual *</label>
          <input name="current_km" type="number" value={form.current_km} onChange={handleChange} required min={0} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Color</label>
          <input name="color" value={form.color} onChange={handleChange} placeholder="Blanco" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>VIN / N° de Serie</label>
          <input name="vin" value={form.vin} onChange={handleChange} placeholder="1HGBH41JXMN109186" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Foto del Vehículo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-construserv-orange file:text-white hover:file:bg-orange-700 cursor-pointer"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notas</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className={inputClass} placeholder="Observaciones del vehículo..." />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-construserv-orange hover:bg-orange-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-60"
        >
          {loading ? "Guardando..." : isEditing ? "Actualizar Vehículo" : "Registrar Vehículo"}
        </button>
      </div>
    </form>
  );
}
