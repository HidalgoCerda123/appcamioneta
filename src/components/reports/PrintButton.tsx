"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print flex items-center gap-2 bg-construserv-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition"
    >
      <Printer className="w-4 h-4" />
      Imprimir / Guardar PDF
    </button>
  );
}
