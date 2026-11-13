import { invalidCompositionField } from "@/src/features/composition/composition";
import type { BodyInput, DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { toKg, weightValue, type WeightUnit } from "@/src/lib/units";

/**
 * La parte corporal del día (peso y composición): lo que se escribe, en la
 * unidad elegida, y cómo se convierte en lo que se guarda, en kg. Módulo puro.
 * Lo comido no pasa por aquí: son entradas de `nutrition/meals`.
 */
export type BodyForm = { weight: string; bodyFat: string; muscle: string; water: string; bone: string };

export const emptyForm = (): BodyForm => ({ weight: "", bodyFat: "", muscle: "", water: "", bone: "" });

const text = (value: number | null | undefined) => (value ? String(value) : "");
const mass = (kg: number | null | undefined, unit: WeightUnit) => (kg ? weightValue(kg, unit) : "");

export function formFromRecord(record: DailyBiometrics | null, unit: WeightUnit): BodyForm {
  if (!record) return emptyForm();
  return {
    weight: mass(record.weightKg, unit),
    bodyFat: text(record.bodyFatPct),
    muscle: mass(record.muscleMassKg, unit),
    water: text(record.waterPct),
    bone: mass(record.boneMassKg, unit),
  };
}

const optional = (value: string) => (value.trim() && Number(value) > 0 ? Number(value) : null);

export type BodyInputResult = { input: BodyInput; error: null } | { input: null; error: string };

/** Valida el formulario y arma el registro. Devuelve el mensaje a mostrar si algo no cuadra. */
export function buildBodyInput(form: BodyForm, unit: WeightUnit): BodyInputResult {
  const weightKg = toKg(Number(form.weight), unit);
  if (!Number.isFinite(weightKg) || weightKg <= 0)
    return { input: null, error: `Escribe tu peso del día en ${unit}.` };
  if (weightKg < 30 || weightKg > 300)
    return { input: null, error: "El peso está fuera de un rango razonable." };
  const muscle = optional(form.muscle);
  const bone = optional(form.bone);
  const composition = {
    bodyFatPct: optional(form.bodyFat),
    muscleMassKg: muscle === null ? null : toKg(muscle, unit),
    waterPct: optional(form.water),
    boneMassKg: bone === null ? null : toKg(bone, unit),
  };
  const invalid = invalidCompositionField(composition, weightKg);
  if (invalid)
    return {
      input: null,
      error: `Revisa la ${invalid}: el valor está fuera de rango.`.replace("la %", "el %"),
    };
  return { input: { weightKg, ...composition }, error: null };
}

/** Un día cuenta como "con datos" si tiene pesaje, composición o algo comido. */
export const hasData = (record: DailyBiometrics | null) =>
  Boolean(record && (record.weightKg || record.caloriesIn || record.proteinG || record.bodyFatPct));
