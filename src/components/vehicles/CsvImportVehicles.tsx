"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";

const TEMPLATE_HEADERS = ["patente", "marca", "modelo", "año", "tipo", "color", "vin", "kilometraje", "estado", "notas"];
const VEHICLE_TYPES = ["camioneta", "camion", "maquinaria_pesada", "furgon", "otro"];
const VEHICLE_STATUSES = ["activo", "en_mantencion", "fuera_de_servicio"];

interface Row {
  line: number;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  type: string;
  color: string;
  vin: string;
  current_km: number;
  status: string;
  notes: string;
  error?: string;
}

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_áéíóú]/g, ""));
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (key: string) => cols[headers.indexOf(key)] ?? "";

    const plate = get("patente").toUpperCase().replace(/\s/g, "");
    const brand = get("marca");
    const model = get("modelo");
    const yearRaw = get("año") || get("ano");
    const year = yearRaw ? parseInt(yearRaw) : null;
    const type = get("tipo").toLowerCase() || "otro";
    const color = get("color");
    const vin = get("vin");
    const kmRaw = get("kilometraje");
    const current_km = kmRaw ? parseInt(kmRaw.replace(/[^0-9]/g, "")) : 0;
    const statusRaw = get("estado").toLowerCase();
    const status = VEHICLE_STATUSES.includes(statusRaw) ? statusRaw : "activo";
    const notes = get("notas");

    let error: string | undefined;
    if (!plate) error = "Patente requerida";
    else if (!brand) error = "Marca requerida";
    else if (!model) error = "Modelo requerido";
    else if (year && (year < 1950 || year > new Date().getFullYear() + 1)) error = "Año inválido";
    else if (!VEHICLE_TYPES.includes(type)) error = `Tipo inválido: "${type}" (válidos: ${VEHICLE_TYPES.join(", ")})`;

    rows.push({ line: i + 1, plate, brand, model, year, type, color, vin, current_km, status, notes, error });
  }

  return rows;
}

function downloadTemplate() {
  const example = [
    TEMPLATE_HEADERS.join(","),
    "ABCD12,Toyota,Hilux,2022,camioneta,Blanco,1HGBH41JXMN109186,150000,activo,Camioneta de faena",
    "XY5432,Caterpillar,330,2020,maquinaria_pesada,Amarillo,,0,activo,Excavadora",
  ].join("\n");

  const blob = new Blob([example], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_vehiculos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CsvImportVehicles() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ ok: number; errors: string[] } | null>(null);

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => r.error);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setResults(null);
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    if (!validRows.length) return;
    setImporting(true);

    const { data: { user } } = await supabase.auth.getUser();
    const errors: string[] = [];
    let ok = 0;

    for (const row of validRows) {
      const { error } = await supabase.from("vehicles").insert({
        plate: row.plate,
        brand: row.brand,
        model: row.model,
        year: row.year,
        type: row.type,
        color: row.color || null,
        vin: row.vin || null,
        current_km: row.current_km,
        status: row.status,
        notes: row.notes || null,
        created_by: user?.id,
      });
      if (error) {
        errors.push(`Fila ${row.line} (${row.plate}): ${error.message}`);
      } else {
        ok++;
      }
    }

    setResults({ ok, errors });
    setImporting(false);
    if (ok > 0) setRows([]);
  }

  return (
    <div className="space-y-6">
      {/* Instrucciones */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Instrucciones</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Descarga la plantilla CSV y completa los datos</li>
              <li>Columnas obligatorias: <span className="font-medium">patente, marca, modelo</span></li>
              <li>Tipos válidos: {VEHICLE_TYPES.join(", ")}</li>
              <li>Estados válidos: activo, en_mantencion, fuera_de_servicio (por defecto: activo)</li>
              <li>El separador de columnas es la coma (,)</li>
            </ul>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Descargar Plantilla
          </button>
        </div>

        {/* Dropzone */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-construserv-orange transition cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Haz clic para seleccionar un archivo CSV</p>
          <p className="text-xs text-gray-400 mt-1">o arrastra y suelta aquí</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </div>
      </div>

      {/* Vista previa */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Vista previa</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="text-green-700 font-medium">{validRows.length} válidos</span>
                {invalidRows.length > 0 && (
                  <span className="text-red-600 font-medium ml-3">{invalidRows.length} con errores</span>
                )}
              </p>
            </div>
            {validRows.length > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 bg-construserv-orange hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? "Importando..." : `Importar ${validRows.length} vehículos`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Fila</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Patente</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Marca / Modelo</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Año</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Tipo</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Km</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.line} className={row.error ? "bg-red-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-2 text-gray-500">{row.line}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{row.plate}</td>
                    <td className="px-4 py-2 text-gray-700">{row.brand} {row.model}</td>
                    <td className="px-4 py-2 text-gray-700">{row.year ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-700">{row.type}</td>
                    <td className="px-4 py-2 text-gray-700">{row.current_km > 0 ? row.current_km.toLocaleString("es-CL") : "—"}</td>
                    <td className="px-4 py-2">
                      {row.error ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {row.error}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {row.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultados */}
      {results && (
        <div className={`rounded-xl p-5 border ${results.errors.length === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            {results.errors.length === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            )}
            <span className="font-semibold text-gray-800">
              {results.ok} vehículo(s) importado(s) correctamente
              {results.errors.length > 0 && `, ${results.errors.length} con errores`}
            </span>
          </div>
          {results.errors.length > 0 && (
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside mt-2">
              {results.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {results.ok > 0 && (
            <Link href="/dashboard/vehiculos" className="inline-flex items-center gap-1.5 mt-3 text-sm text-construserv-orange hover:underline font-medium">
              Ver vehículos importados →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
