"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Ocurrió un error</h2>
        <p className="text-gray-500 text-sm mb-2">
          Algo salió mal al cargar esta página.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-6 font-mono">Código: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-construserv-orange hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg font-medium transition text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
