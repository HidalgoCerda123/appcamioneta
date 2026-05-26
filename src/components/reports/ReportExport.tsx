"use client";

import { Download } from "lucide-react";

interface MaintenanceRow {
  tipo: string;
  vehiculo: string;
  patente: string;
  taller: string;
  fecha: string;
  km: number;
  costo: number;
}

interface Props {
  maintenances: MaintenanceRow[];
  year: number;
}

export default function ReportExport({ maintenances, year }: Props) {
  function exportCSV() {
    const headers = ["Tipo", "Vehículo", "Patente", "Taller", "Fecha", "Km", "Costo (CLP)"];
    const rows = maintenances.map((m) => [
      m.tipo,
      m.vehiculo,
      m.patente,
      m.taller,
      m.fecha,
      m.km,
      m.costo,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mantenciones_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={exportCSV}
      disabled={maintenances.length === 0}
      title="Exportar mantenciones a CSV"
      className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Exportar CSV</span>
    </button>
  );
}
