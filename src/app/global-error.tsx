"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="es">
      <body>
        <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1f2937", marginBottom: "0.5rem" }}>
              Error crítico de la aplicación
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              La aplicación encontró un error grave. Por favor recarga la página.
            </p>
            <button
              onClick={reset}
              style={{ background: "#E8500A", color: "white", border: "none", padding: "0.625rem 1.5rem", borderRadius: "0.5rem", fontWeight: 500, cursor: "pointer", fontSize: "0.875rem" }}
            >
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
