"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCheck, Plus, X, Phone, CreditCard, FileText, Calendar, FolderOpen } from "lucide-react";
import { formatDate, validateRut, formatRut } from "@/lib/utils";
import DriverDocumentsForm from "./DriverDocumentsForm";

interface Driver {
  id: string;
  driver_name: string;
  driver_rut?: string;
  driver_phone?: string;
  driver_license?: string;
  start_date: string;
  end_date?: string;
  notes?: string;
  license_type?: string;
  license_expiry?: string;
  license_front_url?: string;
  license_back_url?: string;
  id_front_url?: string;
  id_back_url?: string;
  cv_url?: string;
}

interface Props {
  vehicleId: string;
  drivers: Driver[];
}

export default function DriverSection({ vehicleId, drivers: initialDrivers }: Props) {
  const supabase = createClient();
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [showForm, setShowForm] = useState(false);
  const [docsDriverId, setDocsDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    driver_name: "",
    driver_rut: "",
    driver_phone: "",
    driver_license: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
  });

  const currentDriver = drivers.find((d) => !d.end_date);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleRutBlur() {
    if (form.driver_rut) {
      setForm((prev) => ({ ...prev, driver_rut: formatRut(prev.driver_rut) }));
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validar RUT si se ingresó
    if (form.driver_rut && !validateRut(form.driver_rut)) {
      setError("El RUT ingresado no es válido. Verifica el formato (ej: 12.345.678-9).");
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Si hay conductor activo, cerrar su período
      if (currentDriver) {
        await supabase
          .from("vehicle_drivers")
          .update({ end_date: form.start_date })
          .eq("id", currentDriver.id);
      }

      const { data, error } = await supabase
        .from("vehicle_drivers")
        .insert({
          vehicle_id: vehicleId,
          driver_name: form.driver_name,
          driver_rut: form.driver_rut || null,
          driver_phone: form.driver_phone || null,
          driver_license: form.driver_license || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          notes: form.notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Actualizar lista local
      setDrivers((prev) =>
        prev
          .map((d) => d.id === currentDriver?.id ? { ...d, end_date: form.start_date } : d)
          .concat(data)
      );

      setShowForm(false);
      setForm({ driver_name: "", driver_rut: "", driver_phone: "", driver_license: "", start_date: new Date().toISOString().split("T")[0], end_date: "", notes: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
    setLoading(false);
  }

  function handleDocsSaved(driverId: string, updated: Record<string, string | null>) {
    setDrivers((prev) =>
      prev.map((d) => d.id === driverId ? { ...d, ...updated } : d)
    );
    setDocsDriverId(null);
  }

  async function handleEndAssignment(driverId: string) {
    const driver = drivers.find((d) => d.id === driverId);
    if (!confirm(`¿Terminar asignación de ${driver?.driver_name ?? "este conductor"} hoy? Esta acción no se puede deshacer.`)) return;
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("vehicle_drivers").update({ end_date: today }).eq("id", driverId);
    setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, end_date: today } : d));
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-construserv-orange text-sm";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-green-500" />
          Conductor / Responsable
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-construserv-orange hover:text-orange-700 text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          {currentDriver ? "Cambiar conductor" : "Asignar conductor"}
        </button>
      </div>

      {/* Conductor actual */}
      {currentDriver && (
        <div className="px-5 py-4 bg-green-50 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {currentDriver.driver_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{currentDriver.driver_name}</p>
                <p className="text-xs text-green-600 font-medium">Conductor actual</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {currentDriver.driver_rut && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <CreditCard className="w-3 h-3" /> {currentDriver.driver_rut}
                    </span>
                  )}
                  {currentDriver.driver_phone && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="w-3 h-3" /> {currentDriver.driver_phone}
                    </span>
                  )}
                  {currentDriver.driver_license && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <FileText className="w-3 h-3" /> Licencia: {currentDriver.driver_license}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" /> Desde {formatDate(currentDriver.start_date)}
                  </span>
                </div>
                {currentDriver.notes && (
                  <p className="text-xs text-gray-400 mt-1">{currentDriver.notes}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => handleEndAssignment(currentDriver.id)}
                className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition"
                title="Terminar asignación hoy"
              >
                <X className="w-3.5 h-3.5" /> Terminar
              </button>
              <button
                onClick={() => setDocsDriverId(docsDriverId === currentDriver.id ? null : currentDriver.id)}
                className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition"
                title="Ver/editar documentos del conductor"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Documentos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de documentos del conductor actual */}
      {docsDriverId === currentDriver?.id && currentDriver && (
        <DriverDocumentsForm
          driverId={currentDriver.id}
          driverName={currentDriver.driver_name}
          initialData={{
            license_type: currentDriver.license_type,
            license_expiry: currentDriver.license_expiry,
            license_front_url: currentDriver.license_front_url,
            license_back_url: currentDriver.license_back_url,
            id_front_url: currentDriver.id_front_url,
            id_back_url: currentDriver.id_back_url,
            cv_url: currentDriver.cv_url,
          }}
          onClose={() => setDocsDriverId(null)}
          onSaved={(updated) => handleDocsSaved(currentDriver.id, updated)}
        />
      )}

      {!currentDriver && !showForm && (
        <p className="px-5 py-4 text-sm text-gray-400">Sin conductor asignado actualmente.</p>
      )}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleAssign} className="p-5 border-b border-gray-100 bg-gray-50 space-y-3">
          <p className="text-sm font-medium text-gray-700 mb-1">
            {currentDriver ? "Asignar nuevo conductor (cierra el período del actual)" : "Asignar conductor"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Nombre completo *</label>
              <input name="driver_name" value={form.driver_name} onChange={handleChange} required placeholder="Juan Pérez" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">RUT</label>
              <input name="driver_rut" value={form.driver_rut} onChange={handleChange} onBlur={handleRutBlur} placeholder="12.345.678-9" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Teléfono</label>
              <input name="driver_phone" value={form.driver_phone} onChange={handleChange} placeholder="+56 9 1234 5678" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">N° Licencia de conducir</label>
              <input name="driver_license" value={form.driver_license} onChange={handleChange} placeholder="12345678" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Fecha de inicio *</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Fecha de término (opcional)</label>
              <input name="end_date" type="date" value={form.end_date} onChange={handleChange} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-600 mb-1 block">Notas</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="Ej: Asignado para obra Los Andes" className={inputClass} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-construserv-orange hover:bg-orange-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60">
              {loading ? "Guardando..." : "Confirmar asignación"}
            </button>
          </div>
        </form>
      )}

      {/* Historial */}
      {drivers.filter((d) => d.end_date).length > 0 && (
        <div className="divide-y divide-gray-50">
          <p className="px-5 pt-3 pb-1 text-xs text-gray-400 uppercase tracking-wide font-medium">Historial</p>
          {drivers
            .filter((d) => d.end_date)
            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
            .map((d) => (
              <div key={d.id}>
                <div className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{d.driver_name}</p>
                    {d.driver_rut && <p className="text-xs text-gray-400">{d.driver_rut}</p>}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{formatDate(d.start_date)} → {formatDate(d.end_date!)}</p>
                    {d.notes && <p className="text-gray-300 mt-0.5">{d.notes}</p>}
                    <button
                      onClick={() => setDocsDriverId(docsDriverId === d.id ? null : d.id)}
                      className="mt-1 text-blue-400 hover:text-blue-600 flex items-center gap-1 ml-auto transition"
                    >
                      <FolderOpen className="w-3 h-3" /> Documentos
                    </button>
                  </div>
                </div>
                {docsDriverId === d.id && (
                  <DriverDocumentsForm
                    driverId={d.id}
                    driverName={d.driver_name}
                    initialData={{
                      license_type: d.license_type,
                      license_expiry: d.license_expiry,
                      license_front_url: d.license_front_url,
                      license_back_url: d.license_back_url,
                      id_front_url: d.id_front_url,
                      id_back_url: d.id_back_url,
                      cv_url: d.cv_url,
                    }}
                    onClose={() => setDocsDriverId(null)}
                    onSaved={(updated) => handleDocsSaved(d.id, updated)}
                  />
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
