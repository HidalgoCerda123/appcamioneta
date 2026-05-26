"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, FileText } from "lucide-react";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface Document {
  id: string;
  vehicle_id: string;
  type: string;
  label: string;
  issue_date?: string;
  expiry_date: string;
  document_url?: string;
  file_urls?: string[];
  amount_paid?: number;
  issuer?: string;
  policy_number?: string;
  notes?: string;
  km_at_renewal?: number;
}

interface Props {
  vehicles: Vehicle[];
  preselectedVehicleId?: string;
  document?: Document;
}

export default function DocumentForm({ vehicles, preselectedVehicleId, document }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!document;

  const typeLabels: Record<string, string> = {
    revision_tecnica: "Revisión Técnica",
    soap: "SOAP",
    permiso_circulacion: "Permiso de Circulación",
    seguro: "Seguro",
    licencia_operador: "Licencia de Operador",
    otro: "Otro",
  };

  const [form, setForm] = useState({
    vehicle_id: document?.vehicle_id ?? preselectedVehicleId ?? "",
    type: document?.type ?? "revision_tecnica",
    label: document?.label ?? "",
    issue_date: document?.issue_date ?? "",
    expiry_date: document?.expiry_date ?? "",
    amount_paid: document?.amount_paid?.toString() ?? "",
    km_at_renewal: document?.km_at_renewal?.toString() ?? "",
    issuer: document?.issuer ?? "",
    policy_number: document?.policy_number ?? "",
    notes: document?.notes ?? "",
  });

  // Archivos existentes (al editar)
  const existingUrls: string[] = [
    ...(document?.file_urls ?? []),
    ...(document?.document_url ? [document.document_url] : []),
  ].filter(Boolean);

  const [keepUrls, setKeepUrls] = useState<string[]>(existingUrls);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const type = e.target.value;
    setForm((prev) => ({ ...prev, type, label: prev.label || typeLabels[type] }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function removeExistingFile(url: string) {
    setKeepUrls((prev) => prev.filter((u) => u !== url));
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function getFileName(url: string) {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1].split("?")[0]).slice(0, 30);
    } catch {
      return "Archivo";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Validar que fecha de vencimiento sea posterior a fecha de emisión
      if (form.issue_date && form.expiry_date && form.expiry_date <= form.issue_date) {
        throw new Error("La fecha de vencimiento debe ser posterior a la fecha de emisión.");
      }

      // Validar que el km no sea menor al registrado en el vehículo
      if (form.vehicle_id && form.km_at_renewal && Number(form.km_at_renewal) > 0) {
        const { data: veh } = await supabase.from("vehicles").select("current_km").eq("id", form.vehicle_id).single();
        if (veh && Number(form.km_at_renewal) < veh.current_km && !isEditing) {
          throw new Error(`El kilometraje ingresado (${Number(form.km_at_renewal).toLocaleString("es-CL")} km) es menor al registrado en el vehículo (${veh.current_km.toLocaleString("es-CL")} km). Verifica el valor.`);
        }
      }

      // Subir nuevos archivos
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file);
        if (uploadError) throw new Error(uploadError.message);
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(uploadData.path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const allFileUrls = [...keepUrls, ...uploadedUrls];

      const payload = {
        vehicle_id: form.vehicle_id,
        type: form.type,
        label: form.label || typeLabels[form.type],
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date,
        file_urls: allFileUrls,
        document_url: allFileUrls[0] ?? null, // retrocompatibilidad
        amount_paid: form.amount_paid ? Number(form.amount_paid) : null,
        km_at_renewal: form.km_at_renewal ? Number(form.km_at_renewal) : null,
        issuer: form.issuer || null,
        policy_number: form.policy_number || null,
        notes: form.notes || null,
      };

      let dbError;
      if (isEditing) {
        ({ error: dbError } = await supabase.from("vehicle_documents").update(payload).eq("id", document.id));
      } else {
        ({ error: dbError } = await supabase.from("vehicle_documents").insert({ ...payload, created_by: user.id }));
      }

      if (dbError) throw new Error(dbError.message);

      // Actualizar kilometraje del vehículo si el ingresado es mayor
      if (form.km_at_renewal) {
        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("current_km")
          .eq("id", form.vehicle_id)
          .single();
        if (vehicle && Number(form.km_at_renewal) > vehicle.current_km) {
          await supabase
            .from("vehicles")
            .update({ current_km: Number(form.km_at_renewal) })
            .eq("id", form.vehicle_id);
        }
      }

      if (isEditing) {
        router.push(`/dashboard/documentos/${document.id}`);
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
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tipo de documento *</label>
          <select name="type" value={form.type} onChange={handleTypeChange} className={inputClass}>
            <option value="revision_tecnica">Revisión Técnica</option>
            <option value="soap">SOAP</option>
            <option value="permiso_circulacion">Permiso de Circulación</option>
            <option value="seguro">Seguro de Vehículo</option>
            <option value="licencia_operador">Licencia de Operador</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Nombre / Etiqueta *</label>
          <input name="label" value={form.label} onChange={handleChange} required placeholder="Ej: Revisión Técnica 2025" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fecha de emisión</label>
          <input name="issue_date" type="date" value={form.issue_date} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fecha de vencimiento *</label>
          <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Monto pagado (CLP)</label>
          <input name="amount_paid" type="number" min={0} value={form.amount_paid} onChange={handleChange} placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Kilometraje al renovar</label>
          <input name="km_at_renewal" type="number" min={0} value={form.km_at_renewal} onChange={handleChange} placeholder="Ej: 158000" className={inputClass} />
          <p className="text-xs text-gray-400 mt-1">Si es mayor al registrado, actualiza el km del vehículo automáticamente</p>
        </div>
        <div>
          <label className={labelClass}>Emisor / Aseguradora</label>
          <input name="issuer" value={form.issuer} onChange={handleChange} placeholder="Ej: CONAFE, Mapfre..." className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>N° Póliza / Folio</label>
          <input name="policy_number" value={form.policy_number} onChange={handleChange} placeholder="123456789" className={inputClass} />
        </div>
      </div>

      {/* Archivos adjuntos */}
      <div>
        <label className={labelClass}>
          <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Fotos / Boletas / Facturas</span>
        </label>

        {/* Archivos existentes */}
        {keepUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {keepUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 hover:underline max-w-32 truncate">
                  {getFileName(url)}
                </a>
                <button type="button" onClick={() => removeExistingFile(url)} className="text-blue-400 hover:text-red-500 transition ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Nuevos archivos seleccionados */}
        {newFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {newFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                <FileText className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="text-xs text-green-700 max-w-32 truncate">{file.name}</span>
                <button type="button" onClick={() => removeNewFile(i)} className="text-green-400 hover:text-red-500 transition ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={(e) => setNewFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-construserv-orange file:text-white hover:file:bg-orange-700 cursor-pointer"
        />
        <p className="text-xs text-gray-400 mt-1">Puedes subir múltiples imágenes o PDFs</p>
      </div>

      <div>
        <label className={labelClass}>Notas</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className={inputClass} placeholder="Observaciones adicionales..." />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="flex-1 bg-construserv-orange hover:bg-orange-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-60">
          {loading ? "Guardando..." : isEditing ? "Guardar Cambios" : "Registrar Documento"}
        </button>
      </div>
    </form>
  );
}
