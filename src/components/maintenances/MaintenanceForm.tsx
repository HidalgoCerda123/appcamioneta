"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Upload, Check, X } from "lucide-react";
import type { MaintenancePart } from "@/types";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface Maintenance {
  id: string;
  vehicle_id: string;
  date: string;
  km_at_service: number;
  type: string;
  subcategory?: string;
  workshop_name: string;
  workshop_address?: string;
  workshop_phone?: string;
  description: string;
  parts_replaced: MaintenancePart[];
  labor_cost: number;
  parts_cost: number;
  next_service_km?: number;
  next_service_date?: string;
  performed_by?: string;
  invoice_urls: string[];
  photo_urls: string[];
}

interface Props {
  vehicles: Vehicle[];
  preselectedVehicleId?: string;
  maintenance?: Maintenance;
  customTypes?: string[];
}

const DEFAULT_TYPE_OPTIONS = [
  { value: "aceite",      label: "Cambio de Aceite" },
  { value: "frenos",      label: "Frenos" },
  { value: "neumaticos",  label: "Neumáticos" },
  { value: "filtros",     label: "Filtros" },
  { value: "suspension",  label: "Suspensión" },
  { value: "electrico",   label: "Eléctrico" },
  { value: "general",     label: "Mantención General" },
  { value: "otro",        label: "Otro" },
];

const emptyPart: MaintenancePart = {
  name: "",
  brand: "",
  part_number: "",
  quantity: 1,
  unit_cost: 0,
  warranty_months: 0,
};

export default function MaintenanceForm({ vehicles, preselectedVehicleId, maintenance, customTypes: initialCustomTypes = [] }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!maintenance;

  const [extraTypes, setExtraTypes] = useState<string[]>(initialCustomTypes);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const newTypeInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    vehicle_id: maintenance?.vehicle_id ?? preselectedVehicleId ?? "",
    date: maintenance?.date ?? new Date().toISOString().split("T")[0],
    km_at_service: maintenance?.km_at_service ?? 0,
    type: maintenance?.type ?? "general",
    subcategory: maintenance?.subcategory ?? "",
    workshop_name: maintenance?.workshop_name ?? "",
    workshop_address: maintenance?.workshop_address ?? "",
    workshop_phone: maintenance?.workshop_phone ?? "",
    description: maintenance?.description ?? "",
    labor_cost: maintenance?.labor_cost ?? 0,
    parts_cost: maintenance?.parts_cost ?? 0,
    next_service_km: maintenance?.next_service_km?.toString() ?? "",
    next_service_date: maintenance?.next_service_date ?? "",
    performed_by: maintenance?.performed_by ?? "",
  });

  function confirmNewType() {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    if (!extraTypes.includes(trimmed)) {
      setExtraTypes((prev) => [...prev, trimmed]);
    }
    setForm((prev) => ({ ...prev, type: trimmed }));
    setNewTypeName("");
    setShowNewType(false);
  }

  const [parts, setParts] = useState<MaintenancePart[]>(maintenance?.parts_replaced ?? []);
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalCost = Number(form.labor_cost) + Number(form.parts_cost);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function addPart() {
    setParts((prev) => [...prev, { ...emptyPart }]);
  }

  function removePart(index: number) {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePart(index: number, field: keyof MaintenancePart, value: string | number) {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const updated = { ...p, [field]: value };
        return updated;
      })
    );
    // Recalcular costo de partes
    if (field === "quantity" || field === "unit_cost") {
      const updated = parts.map((p, i) => {
        if (i !== index) return p;
        return { ...p, [field]: Number(value) };
      });
      const newPartsCost = updated.reduce((sum, p) => sum + p.quantity * p.unit_cost, 0);
      setForm((prev) => ({ ...prev, parts_cost: newPartsCost }));
    }
  }

  async function uploadFiles(files: File[], bucket: string): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
      if (error) throw new Error(error.message);
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Validar que el km no sea menor al registrado en el vehículo
      if (form.vehicle_id && Number(form.km_at_service) > 0) {
        const { data: veh } = await supabase.from("vehicles").select("current_km").eq("id", form.vehicle_id).single();
        if (veh && Number(form.km_at_service) < veh.current_km && !isEditing) {
          throw new Error(`El kilometraje ingresado (${Number(form.km_at_service).toLocaleString("es-CL")} km) es menor al registrado en el vehículo (${veh.current_km.toLocaleString("es-CL")} km). Verifica el valor.`);
        }
      }

      // Validar que next_service_km > km_at_service
      if (form.next_service_km && Number(form.next_service_km) <= Number(form.km_at_service)) {
        throw new Error("El km del próximo servicio debe ser mayor al km actual de la mantención.");
      }

      const [newInvoiceUrls, newPhotoUrls] = await Promise.all([
        uploadFiles(invoiceFiles, "maintenance-files"),
        uploadFiles(photoFiles, "maintenance-files"),
      ]);

      // Mantener archivos existentes + agregar nuevos
      const invoiceUrls = [...(maintenance?.invoice_urls ?? []), ...newInvoiceUrls];
      const photoUrls = [...(maintenance?.photo_urls ?? []), ...newPhotoUrls];

      const payload = {
        vehicle_id: form.vehicle_id,
        date: form.date,
        km_at_service: Number(form.km_at_service),
        type: form.type,
        subcategory: form.subcategory || null,
        workshop_name: form.workshop_name,
        workshop_address: form.workshop_address || null,
        workshop_phone: form.workshop_phone || null,
        description: form.description,
        parts_replaced: parts,
        labor_cost: Number(form.labor_cost),
        parts_cost: Number(form.parts_cost),
        total_cost: totalCost,
        invoice_urls: invoiceUrls,
        photo_urls: photoUrls,
        next_service_km: form.next_service_km ? Number(form.next_service_km) : null,
        next_service_date: form.next_service_date || null,
        performed_by: form.performed_by || null,
      };

      let error;
      if (isEditing) {
        ({ error } = await supabase.from("maintenances").update(payload).eq("id", maintenance.id));
      } else {
        ({ error } = await supabase.from("maintenances").insert({ ...payload, created_by: user.id }));
      }
      if (error) throw new Error(error.message);

      // Actualizar kilometraje del vehículo si es mayor + registrar lectura de odómetro
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("current_km")
        .eq("id", form.vehicle_id)
        .single();

      if (!isEditing && Number(form.km_at_service) > 0) {
        await supabase.from("odometer_readings").insert({
          vehicle_id: form.vehicle_id,
          km: Number(form.km_at_service),
          reading_date: form.date,
          source: "maintenance",
          recorded_by: user.id,
        });
      }

      if (vehicle && Number(form.km_at_service) > vehicle.current_km) {
        await supabase
          .from("vehicles")
          .update({ current_km: Number(form.km_at_service) })
          .eq("id", form.vehicle_id);
      }

      if (isEditing) {
        router.push(`/dashboard/mantenciones/${maintenance.id}`);
      } else {
        router.push(`/dashboard/vehiculos/${form.vehicle_id}`);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-construserv-orange focus:border-transparent transition text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos principales */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Datos del Servicio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Vehículo *</label>
            <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} required className={inputClass}>
              <option value="">Seleccionar vehículo...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} — {v.plate}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fecha *</label>
            <input name="date" type="date" value={form.date} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Kilometraje al servicio *</label>
            <input name="km_at_service" type="number" value={form.km_at_service} onChange={handleChange} required min={0} className={inputClass} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass} style={{ marginBottom: 0 }}>Tipo de mantención *</label>
              {!showNewType && (
                <button
                  type="button"
                  onClick={() => { setShowNewType(true); setTimeout(() => newTypeInputRef.current?.focus(), 50); }}
                  className="flex items-center gap-1 text-xs text-construserv-orange hover:text-orange-700 font-medium transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear tipo
                </button>
              )}
            </div>
            {showNewType ? (
              <div className="flex gap-2">
                <input
                  ref={newTypeInputRef}
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmNewType(); } if (e.key === "Escape") { setShowNewType(false); setNewTypeName(""); } }}
                  placeholder="Nombre del nuevo tipo..."
                  className={inputClass}
                />
                <button type="button" onClick={confirmNewType} className="px-3 py-2 bg-construserv-orange text-white rounded-lg hover:bg-orange-700 transition">
                  <Check className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { setShowNewType(false); setNewTypeName(""); }} className="px-3 py-2 border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-50 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
                <optgroup label="Tipos estándar">
                  {DEFAULT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
                {extraTypes.length > 0 && (
                  <optgroup label="Tipos personalizados">
                    {extraTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>
          <div>
            <label className={labelClass}>Técnico / Responsable</label>
            <input name="performed_by" value={form.performed_by} onChange={handleChange} placeholder="Nombre del técnico" className={inputClass} />
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>Descripción del trabajo realizado *</label>
          <textarea name="description" value={form.description} onChange={handleChange} required rows={3} className={inputClass} placeholder="Describe los trabajos realizados..." />
        </div>
      </div>

      {/* Taller */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Taller / Lugar de Servicio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre del taller *</label>
            <input name="workshop_name" value={form.workshop_name} onChange={handleChange} required placeholder="Automotora Ejemplo" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Dirección</label>
            <input name="workshop_address" value={form.workshop_address} onChange={handleChange} placeholder="Av. Principal 123" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input name="workshop_phone" value={form.workshop_phone} onChange={handleChange} placeholder="+56 9 1234 5678" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Piezas reemplazadas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Piezas / Repuestos Cambiados</h3>
          <button type="button" onClick={addPart} className="flex items-center gap-2 text-construserv-orange hover:text-orange-700 text-sm font-medium transition">
            <Plus className="w-4 h-4" />
            Agregar pieza
          </button>
        </div>

        {parts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No se han agregado piezas</p>
        ) : (
          <div className="space-y-3">
            {parts.map((part, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Nombre *</label>}
                  <input value={part.name} onChange={(e) => updatePart(i, "name", e.target.value)} placeholder="Filtro de aceite" className={inputClass} required />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Marca</label>}
                  <input value={part.brand ?? ""} onChange={(e) => updatePart(i, "brand", e.target.value)} placeholder="Bosch" className={inputClass} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">N° Parte</label>}
                  <input value={part.part_number ?? ""} onChange={(e) => updatePart(i, "part_number", e.target.value)} placeholder="F026407xxx" className={inputClass} />
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Cant.</label>}
                  <input type="number" min={1} value={part.quantity} onChange={(e) => updatePart(i, "quantity", Number(e.target.value))} className={inputClass} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Precio unit.</label>}
                  <input type="number" min={0} value={part.unit_cost} onChange={(e) => updatePart(i, "unit_cost", Number(e.target.value))} className={inputClass} />
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Gtía (m)</label>}
                  <input type="number" min={0} value={part.warranty_months ?? 0} onChange={(e) => updatePart(i, "warranty_months", Number(e.target.value))} className={inputClass} />
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  <button type="button" onClick={() => removePart(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Costos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Costos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Mano de obra (CLP)</label>
            <input name="labor_cost" type="number" min={0} value={form.labor_cost} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Repuestos (CLP)</label>
            <input name="parts_cost" type="number" min={0} value={form.parts_cost} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Total</label>
            <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-construserv-orange">
              ${totalCost.toLocaleString("es-CL")}
            </div>
          </div>
        </div>
      </div>

      {/* Próxima mantención */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Próxima Mantención</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Próximo km recomendado</label>
            <input name="next_service_km" type="number" min={0} value={form.next_service_km} onChange={handleChange} placeholder="Ej: 165000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Próxima fecha recomendada</label>
            <input name="next_service_date" type="date" value={form.next_service_date} onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Archivos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Archivos Adjuntos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Facturas / Boletas</span>
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => setInvoiceFiles(Array.from(e.target.files ?? []))}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-construserv-orange file:text-white hover:file:bg-orange-700 cursor-pointer"
            />
            {invoiceFiles.length > 0 && (
              <p className="text-xs text-green-600 mt-1">{invoiceFiles.length} archivo(s) seleccionado(s)</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Fotos del servicio</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-construserv-orange file:text-white hover:file:bg-orange-700 cursor-pointer"
            />
            {photoFiles.length > 0 && (
              <p className="text-xs text-green-600 mt-1">{photoFiles.length} foto(s) seleccionada(s)</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex gap-3 pb-6">
        <button type="button" onClick={() => router.back()} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="flex-1 bg-construserv-orange hover:bg-orange-700 text-white py-3 rounded-lg text-sm font-semibold transition disabled:opacity-60">
          {loading ? "Guardando..." : isEditing ? "Guardar Cambios" : "Registrar Mantención"}
        </button>
      </div>
    </form>
  );
}
