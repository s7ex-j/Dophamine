/**
 * Unidades de peso. El dominio y lo que se guarda van siempre en kilogramos;
 * estas funciones solo se usan al mostrar un valor o al leer lo que se escribe.
 */
export type WeightUnit = "kg" | "lb";

const LB_PER_KG = 2.2046226218;

export const WEIGHT_UNIT_OPTIONS: Array<{ value: WeightUnit; label: string }> = [
  { value: "kg", label: "Kilogramos" },
  { value: "lb", label: "Libras" },
];

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
}

/** Lo que se escribió en la unidad elegida, en kilogramos (dos decimales). */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : Math.round(convertWeight(value, "lb", "kg") * 100) / 100;
}

/**
 * El número a mostrar, sin la unidad. En kg se muestra tal como se guardó; en
 * lb, con un decimal. Con `digits` se fuerza la cantidad de decimales.
 */
export function weightValue(kg: number, unit: WeightUnit, digits?: number): string {
  const value = convertWeight(kg, "kg", unit);
  if (digits !== undefined) return value.toFixed(digits);
  return unit === "kg" ? String(kg) : String(Math.round(value * 10) / 10);
}

export const formatWeight = (kg: number, unit: WeightUnit, digits?: number) =>
  `${weightValue(kg, unit, digits)} ${unit}`;
