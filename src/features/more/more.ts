import { COMPLIANCE_ITEMS, complianceScore, type DayCompliance } from "@/src/features/habits/compliance";
import {
  latestMeasurements,
  measurementChange,
  MEASUREMENT_FIELDS,
  type Measurement,
} from "@/src/features/measurements/measurements";
import { QUESTIONS } from "@/src/features/wellbeing/wellbeing";
import { addDays } from "@/src/lib/dates";

/** Los datos cortos que muestra la pantalla Más. Módulo puro. */
export type TileText = { value: string; detail: string };

const joinWords = (words: string[]) =>
  words.length > 1 ? `${words.slice(0, -1).join(", ")} y ${words[words.length - 1]}` : (words[0] ?? "");

export function habitsTile(compliance: DayCompliance | null): TileText {
  if (!compliance) return { value: "—", detail: "Aún sin datos" };
  const missing = COMPLIANCE_ITEMS.filter((item) => !compliance[item.key]).map((item) =>
    item.label.toLowerCase(),
  );
  return {
    value: `${complianceScore(compliance)} de ${COMPLIANCE_ITEMS.length}`,
    detail:
      missing.length === 0
        ? "Día completo"
        : missing.length <= 2
          ? `Falta${missing.length > 1 ? "n" : ""} ${joinWords(missing)}`
          : `Faltan ${missing.length} hoy`,
  };
}

export function wellbeingTile(mood: number | null): TileText {
  const label = mood ? QUESTIONS[0].options[mood - 1]?.label : null;
  return label
    ? { value: label, detail: "Chequeo hecho hoy" }
    : { value: "Sin anotar", detail: "Tres toques" };
}

export function streakTile(current: number, best: number): TileText {
  return {
    value: `${current} ${current === 1 ? "día" : "días"}`,
    detail:
      current > 0 && current >= best
        ? "Es tu récord"
        : best > 0
          ? `Récord: ${best}`
          : "Registra hoy y empieza",
  };
}

const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0");

/** La cintura si está medida; si no, la primera medida que haya. */
export function measurementsTile(list: Measurement[]): TileText {
  const latest = latestMeasurements(list);
  const field = MEASUREMENT_FIELDS.find(({ key }) => latest[key] !== undefined);
  if (!field) return { value: "Sin medir", detail: "Cintura, brazo, muslo" };
  const change = measurementChange(list, field.key)?.change ?? 0;
  return {
    value: `${latest[field.key]} cm`,
    detail: change ? `${field.label}, ${signed(change)} en total` : field.label,
  };
}

/** "hoy", "ayer" o "hace N días" a partir de una fecha local. */
export function agoLabel(date: string | null, today: string): string {
  if (!date || date > today) return "";
  if (date === today) return "hoy";
  if (date === addDays(today, -1)) return "ayer";
  const days = Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000);
  return `hace ${days} días`;
}
