/**
 * Micronutrientes: fibra, azúcar, grasa saturada, minerales y vitaminas. Módulo puro.
 *
 * Los de los alimentos incluidos salen de la tabla del USDA (FoodData Central, SR Legacy, dominio público);
 * los de Open Food Facts, de su ficha. Un alimento puede no traerlos: entonces no suman, y el resumen dice
 * cuánto de lo comido los tenía.
 *
 * Los valores de referencia son los Valores Diarios generales para adultos de la FDA (EE. UU.). Son una guía
 * para comparar, no una recomendación personal: cada persona necesita distinto.
 */
export const MICRO_KEYS = [
  "fiberG",
  "sugarG",
  "satFatG",
  "sodiumMg",
  "potassiumMg",
  "calciumMg",
  "ironMg",
  "magnesiumMg",
  "zincMg",
  "vitaminAUg",
  "vitaminCMg",
  "vitaminDUg",
  "vitaminB12Ug",
  "folateUg",
] as const;
export type MicroKey = (typeof MICRO_KEYS)[number];
export type Micros = Partial<Record<MicroKey, number>>;

export type MicroInfo = {
  label: string;
  unit: "g" | "mg" | "µg";
  /** Valor diario de referencia. */
  reference: number;
  /** Un tope (no conviene pasarlo) en lugar de una meta. */
  limit?: boolean;
  group: "Carbohidratos y grasas" | "Minerales" | "Vitaminas";
};

export const MICRO_INFO: Record<MicroKey, MicroInfo> = {
  fiberG: { label: "Fibra", unit: "g", reference: 28, group: "Carbohidratos y grasas" },
  sugarG: { label: "Azúcar", unit: "g", reference: 50, limit: true, group: "Carbohidratos y grasas" },
  satFatG: {
    label: "Grasa saturada",
    unit: "g",
    reference: 20,
    limit: true,
    group: "Carbohidratos y grasas",
  },
  sodiumMg: { label: "Sodio", unit: "mg", reference: 2300, limit: true, group: "Minerales" },
  potassiumMg: { label: "Potasio", unit: "mg", reference: 4700, group: "Minerales" },
  calciumMg: { label: "Calcio", unit: "mg", reference: 1300, group: "Minerales" },
  ironMg: { label: "Hierro", unit: "mg", reference: 18, group: "Minerales" },
  magnesiumMg: { label: "Magnesio", unit: "mg", reference: 420, group: "Minerales" },
  zincMg: { label: "Zinc", unit: "mg", reference: 11, group: "Minerales" },
  vitaminAUg: { label: "Vitamina A", unit: "µg", reference: 900, group: "Vitaminas" },
  vitaminCMg: { label: "Vitamina C", unit: "mg", reference: 90, group: "Vitaminas" },
  vitaminDUg: { label: "Vitamina D", unit: "µg", reference: 20, group: "Vitaminas" },
  vitaminB12Ug: { label: "Vitamina B12", unit: "µg", reference: 2.4, group: "Vitaminas" },
  folateUg: { label: "Folato", unit: "µg", reference: 400, group: "Vitaminas" },
};

/** Con cuántos decimales se guarda cada uno: los de miligramos grandes, sin decimales. */
const precision = (key: MicroKey) =>
  MICRO_INFO[key].unit === "mg" && MICRO_INFO[key].reference >= 400 ? 0 : 2;
const roundTo = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const isMicroKey = (key: string): key is MicroKey => (MICRO_KEYS as readonly string[]).includes(key);

/** Los micros de una cantidad: `factor` = gramos / 100. Sin micros, undefined. */
export function scaleMicros(micros: Micros | undefined, factor: number): Micros | undefined {
  if (!micros) return undefined;
  const scaled: Micros = {};
  for (const key of MICRO_KEYS) {
    const value = micros[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0)
      scaled[key] = roundTo(value * factor, precision(key));
  }
  return Object.keys(scaled).length ? scaled : undefined;
}

/** La suma de varios; un nutriente que nadie trae no aparece. */
export function sumMicros(items: Array<Micros | undefined>): Micros | undefined {
  const total: Micros = {};
  for (const micros of items)
    for (const key of MICRO_KEYS) {
      const value = micros?.[key];
      if (typeof value === "number") total[key] = (total[key] ?? 0) + value;
    }
  for (const key of MICRO_KEYS)
    if (total[key] !== undefined) total[key] = roundTo(total[key] ?? 0, precision(key));
  return Object.keys(total).length ? total : undefined;
}

/** Lee micros de un respaldo o del almacén: solo claves conocidas con números válidos. */
export function microsFrom(value: unknown): Micros | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const micros: Micros = {};
  for (const [key, amount] of Object.entries(value))
    if (isMicroKey(key) && typeof amount === "number" && Number.isFinite(amount) && amount >= 0)
      micros[key] = amount;
  return Object.keys(micros).length ? micros : undefined;
}

/** "12.4 g", "830 mg", "1.2 µg". */
export function formatMicro(key: MicroKey, value: number): string {
  const { unit } = MICRO_INFO[key];
  const shown =
    value >= 100
      ? Math.round(value)
      : value >= 10
        ? Math.round(value * 10) / 10
        : Math.round(value * 100) / 100;
  return `${String(shown)} ${unit}`;
}

/** El orden de la tabla del USDA en `builtin.micros.ts`: una fila por alimento, con null si no hay dato. */
export type MicroRow = Array<number | null>;
export function microsFromRow(row: MicroRow): Micros | undefined {
  const micros: Micros = {};
  MICRO_KEYS.forEach((key, index) => {
    const value = row[index];
    if (typeof value === "number") micros[key] = value;
  });
  return Object.keys(micros).length ? micros : undefined;
}

/** La columna `micros` guarda JSON; algo que no se pueda leer cuenta como sin micros. */
export function microsColumn(text: string | null | undefined): { micros?: Micros } {
  if (!text) return {};
  try {
    const micros = microsFrom(JSON.parse(text));
    return micros ? { micros } : {};
  } catch {
    return {};
  }
}
