// Utilidades de fecha en zona horaria de Chile (America/Santiago)

/** Devuelve la fecha de hoy en Chile como "YYYY-MM-DD". */
export function todaySantiago(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA da formato YYYY-MM-DD
}

/** Días enteros transcurridos entre una fecha "YYYY-MM-DD" y hoy (Chile). */
export function daysSince(dateStr: string): number {
  const today = new Date(todaySantiago() + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}
