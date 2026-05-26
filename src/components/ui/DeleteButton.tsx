"use client";

import { useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface DeleteButtonProps {
  table: string;
  id: string;
  redirectTo: string;
  label?: string;
  confirmText?: string;
}

export default function DeleteButton({ table, id, redirectTo, label = "Eliminar", confirmText }: DeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError("");
    const { error } = await supabase.from(table).delete().eq("id", id);
    setLoading(false);
    if (error) {
      setError("No se pudo eliminar. Intenta nuevamente.");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition"
      >
        <Trash2 className="w-4 h-4" />
        {label}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">¿Confirmar eliminación?</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {confirmText ?? "Esta acción no se puede deshacer."}
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {loading ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
