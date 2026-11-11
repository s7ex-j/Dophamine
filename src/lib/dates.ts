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
