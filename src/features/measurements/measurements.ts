/**
 * Medidas corporales con cinta: cuello, pecho, brazo, cintura, cadera y muslo,
 * en cm. Se guardan en ajustes (`body_measurements`, viajan en el respaldo),
 * una medición por día. Módulo puro.
 */
export const MEASUREMENTS_KEY = "body_measurements";

export type MeasurementField = "neckCm" | "chestCm" | "armCm" | "waistCm" | "hipCm" | "thighCm";
export type Measurement = { date: string } & Partial<Record<MeasurementField, number>>;

export const MEASUREMENT_FIELDS: Array<{ key: MeasurementField; label: string; hint: string }> = [
  { key: "waistCm", label: "Cintura", hint: "A la altura del ombligo, sin apretar" },
  { key: "hipCm", label: "Cadera", hint: "En la parte más ancha de los glúteos" },
  { key: "chestCm", label: "Pecho", hint: "A la altura de los pezones" },
  { key: "armCm", label: "Brazo", hint: "Bíceps relajado, en lo más ancho" },
  { key: "thighCm", label: "Muslo", hint: "Debajo del glúteo, en lo más ancho" },
  { key: "neckCm", label: "Cuello", hint: "Debajo de la nuez" },
];

const valid = (value: unknown) => typeof value === "number" && value >= 15 && value <= 250;

/** Lee lo guardado, ordenado del más antiguo al más reciente, sin valores imposibles. */
export function readMeasurements(value: unknown): Measurement[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item): Measurement[] => {
      if (!item || typeof item !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(String(item.date))) return [];
      const entry: Measurement = { date: item.date };
      for (const { key } of MEASUREMENT_FIELDS) if (valid(item[key])) entry[key] = item[key];
      return Object.keys(entry).length > 1 ? [entry] : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Guarda la medición de un día: se combina con la que ya hubiera ese día. */
export function upsertMeasurement(list: Measurement[], entry: Measurement): Measurement[] {
  const merged = { ...(list.find((item) => item.date === entry.date) ?? {}), ...entry };
  return readMeasurements([...list.filter((item) => item.date !== entry.date), merged]);
}

/** Primer y último valor de una medida, y la diferencia. */
export function measurementChange(list: Measurement[], field: MeasurementField) {
  const withValue = list.filter((item) => item[field] !== undefined);
  if (!withValue.length) return null;
  const first = withValue[0][field] as number;
  const last = withValue[withValue.length - 1][field] as number;
  return { first, last, change: Math.round((last - first) * 10) / 10, from: withValue[0].date };
}

/** El valor más reciente de cada medida. */
export function latestMeasurements(list: Measurement[]): Partial<Record<MeasurementField, number>> {
  const latest: Partial<Record<MeasurementField, number>> = {};
  for (const item of list)
    for (const { key } of MEASUREMENT_FIELDS) if (item[key] !== undefined) latest[key] = item[key];
  return latest;
}

/**
 * % de grasa estimado con la fórmula de la Marina de EE. UU. (cintura, cuello,
 * altura y, en mujeres, cadera). Es una estimación con margen de ±3–4 puntos.
 */
export function navyBodyFat(
  sex: "female" | "male",
  heightCm: number,
  values: Partial<Record<MeasurementField, number>>,
): number | null {
  const { waistCm, neckCm, hipCm } = values;
  if (!waistCm || !neckCm || !heightCm) return null;
  const result =
    sex === "male"
      ? waistCm > neckCm
        ? 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450
        : null
      : hipCm && waistCm + hipCm > neckCm
        ? 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) -
          450
        : null;
  return result === null || result < 2 || result > 60 ? null : Math.round(result * 10) / 10;
}

/** Cintura ÷ altura: por debajo de 0.5 se considera un rango saludable. */
export const waistToHeight = (waistCm: number | undefined, heightCm: number) =>
  waistCm && heightCm ? Math.round((waistCm / heightCm) * 100) / 100 : null;
