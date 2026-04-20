"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, FileText, Save } from "lucide-react";

interface Props {
  driverId: string;
  driverName: string;
  initialData: {
    license_type?: string;
    license_expiry?: string;
    license_front_url?: string;
    license_back_url?: string;
    id_front_url?: string;
    id_back_url?: string;
    cv_url?: string;
  };
  onClose: () => void;
  onSaved: (updated: Record<string, string | null>) => void;
}

const LICENSE_TYPES = [
  { value: "A1", label: "A1 — Motocicletas hasta 50cc" },
  { value: "A2", label: "A2 — Motocicletas sobre 50cc" },
  { value: "A3", label: "A3 — Triciclos y cuadriciclos motorizados" },
  { value: "A4", label: "A4 — Vehículos especiales menores" },
  { value: "B",  label: "B — Automóviles y camionetas hasta 3.500 kg" },
  { value: "C",  label: "C — Camiones y vehículos sobre 3.500 kg" },
  { value: "D",  label: "D — Buses y minibuses" },
  { value: "E",  label: "E — Maquinaria pesada y vehículos especiales" },
];

type FileField = "license_front" | "license_back" | "id_front" | "id_back" | "cv";

const FILE_FIELDS: { key: FileField; label: string; accept: string }[] = [
  { key: "license_front", label: "Licencia (anverso)", accept: "image/*,.pdf" },
  { key: "license_back",  label: "Licencia (reverso)", accept: "image/*,.pdf" },
  { key: "id_front",      label: "Carnet / Cédula (anverso)", accept: "image/*,.pdf" },
  { key: "id_back",       label: "Carnet / Cédula (reverso)", accept: "image/*,.pdf" },
  { key: "cv",            label: "Hoja de vida del conductor", accept: "image/*,.pdf" },
];

export default function DriverDocumentsForm({ driverId, driverName, initialData, onClose, onSaved }: Props) {
  const supabase = createClient();

  const [licenseType, setLicenseType] = useState(initialData.license_type ?? "");
  const [licenseExpiry, setLicenseExpiry] = useState(initialData.license_expiry ?? "");
  const [newFiles, setNewFiles] = useState<Partial<Record<FileField, File>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // URLs actuales
  const [currentUrls, setCurrentUrls] = useState({
    license_front_url: initialData.license_front_url ?? null,
    license_back_url:  initialData.license_back_url  ?? null,
    id_front_url:      initialData.id_front_url      ?? null,
    id_back_url:       initialData.id_back_url       ?? null,
    cv_url:            initialData.cv_url             ?? null,
  });

  function setFile(field: FileField, file: File | null) {
    setNewFiles((prev) => {
      const next = { ...prev };
      if (file) next[field] = file;
      else delete next[field];
      return next;
    });
  }

  function removeCurrentUrl(field: keyof typeof currentUrls) {
    setCurrentUrls((prev) => ({ ...prev, [field]: null }));
  }

  async function uploadToStorage(file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const fileName = `drivers/${driverId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from("documents").upload(fileName, file);
    if (error) throw new Error(error.message);
    return supabase.storage.from("documents").getPublicUrl(data.path).data.publicUrl;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const updates: Record<string, string | null> = {
        license_type:   licenseType   || null,
        license_expiry: licenseExpiry || null,
        license_front_url: currentUrls.license_front_url,
        license_back_url:  currentUrls.license_back_url,
        id_front_url:      currentUrls.id_front_url,
        id_back_url:       currentUrls.id_back_url,
        cv_url:            currentUrls.cv_url,
      };

      // Subir archivos nuevos
      for (const { key } of FILE_FIELDS) {
        const file = newFiles[key];
        if (file) {
          const urlKey = `${key}_url` as keyof typeof currentUrls;
          updates[urlKey] = await uploadToStorage(file);
        }
      }

      const { error: dbError } = await supabase
        .from("vehicle_drivers")
        .update(updates)
        .eq("id", driverId);

      if (dbError) throw new Error(dbError.message);

      onSaved(updates);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
    setLoading(false);
  }

  const urlMap: Record<FileField, keyof typeof currentUrls> = {
    license_front: "license_front_url",
    license_back:  "license_back_url",
    id_front:      "id_front_url",
    id_back:       "id_back_url",
    cv:            "cv_url",
  };

  return (
    <form onSubmit={handleSave} className="border-t border-gray-100 bg-gray-50 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-800 text-sm">Documentos de {driverName}</p>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Licencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Licencia</label>
          <select
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
          >
            <option value="">Sin especificar</option>
            {LICENSE_TYPES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vencimiento de Licencia</label>
          <input
            type="date"
            value={licenseExpiry}
            onChange={(e) => setLicenseExpiry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange"
          />
        </div>
      </div>

      {/* Archivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FILE_FIELDS.map(({ key, label, accept }) => {
          const urlKey = urlMap[key];
          const currentUrl = currentUrls[urlKey];
          const newFile = newFiles[key];
          const isImage = currentUrl && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(currentUrl);

          return (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>

              {/* Vista previa archivo actual */}
              {currentUrl && !newFile && (
                <div className="relative mb-2">
                  {isImage ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={currentUrl} alt={label} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => removeCurrentUrl(urlKey)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 hover:underline">
                          Ver archivo
                        </a>
                      </div>
                      <button type="button" onClick={() => removeCurrentUrl(urlKey)} className="text-red-400 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Archivo nuevo seleccionado */}
              {newFile && (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2">
                  <span className="text-xs text-green-700 truncate">{newFile.name}</span>
                  <button type="button" onClick={() => setFile(key, null)} className="text-red-400 hover:text-red-600 ml-2">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <input
                type="file"
                accept={accept}
                onChange={(e) => setFile(key, e.target.files?.[0] ?? null)}
                className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-construserv-orange file:text-white hover:file:bg-orange-700 cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-100 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="flex-1 bg-construserv-orange hover:bg-orange-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {loading ? "Guardando..." : "Guardar documentos"}
        </button>
      </div>
    </form>
  );
}
