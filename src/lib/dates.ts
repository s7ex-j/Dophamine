/**
 * Clave de día (AAAA-MM-DD) según el reloj del dispositivo.
 *
 * No se usa `toISOString()`: devuelve la fecha en UTC, y en Lima (UTC−5) todo lo
 * registrado después de las 7 p. m. quedaba guardado con la fecha del día siguiente.
 */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Suma (o resta) días a una clave AAAA-MM-DD con el calendario local. */
export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return localDateKey(new Date(year, month - 1, day + days));
}

/** "Hoy", "Ayer" o una fecha corta ("mié 11 nov") para encabezados. */
export function dayLabel(dateKey: string, today = localDateKey()): string {
  if (dateKey === today) return "Hoy";
  if (dateKey === addDays(today, -1)) return "Ayer";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" })
    .replace(/[.,]/g, "");
}
