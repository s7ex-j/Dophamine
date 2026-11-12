import { invalidCompositionField } from "@/src/features/composition/composition";
import type { BiometricsInput, DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { toKg, weightValue, type WeightUnit } from "@/src/lib/units";

/**
 * El formulario del Diario: lo que se escribe (textos, en la unidad elegida) y
 * cómo se convierte en el registro del día (números, en kg). Módulo puro.
 */
export type DailyForm = {
  weight: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  bodyFat: string;
  muscle: string;
  water: string;
  bone: string;
};

export const emptyForm = (): DailyForm => ({
  weight: "",
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
  bodyFat: "",
  muscle: "",
  water: "",
  bone: "",
});

const text = (value: number | null | undefined) => (value ? String(value) : "");
const mass = (kg: number | null | undefined, unit: WeightUnit) => (kg ? weightValue(kg, unit) : "");

export function formFromRecord(record: DailyBiometrics | null, unit: WeightUnit): DailyForm {
  if (!record) return emptyForm();
  return {
    weight: weightValue(record.weightKg, unit),
    calories: text(record.caloriesIn),
    protein: text(record.proteinG),
    carbs: text(record.carbsG),
    fats: text(record.fatsG),
    bodyFat: text(record.bodyFatPct),
    muscle: mass(record.muscleMassKg, unit),
    water: text(record.waterPct),
    bone: mass(record.boneMassKg, unit),
  };
}

const amount = (value: string) => (Number(value) > 0 ? Number(value) : 0);
const optional = (value: string) => (value.trim() && Number(value) > 0 ? Number(value) : null);

/** 4 kcal por gramo de proteína y de carbohidrato, 9 por gramo de grasa. */
export const caloriesFromMacros = (proteinG: number, carbsG: number, fatsG: number) =>
  Math.round(proteinG * 4 + carbsG * 4 + fatsG * 9);

/** Calorías del día según el formulario: las escritas o, si se dejan vacías, las de los macros. */
export function formCalories(form: DailyForm): number {
  return (
    amount(form.calories) || caloriesFromMacros(amount(form.protein), amount(form.carbs), amount(form.fats))
  );
}

export type DailyInputResult = { input: BiometricsInput; error: null } | { input: null; error: string };

/** Valida el formulario y arma el registro. Devuelve el mensaje a mostrar si algo no cuadra. */
export function buildDailyInput(form: DailyForm, unit: WeightUnit): DailyInputResult {
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
  return {
    input: {
      weightKg,
      caloriesIn: formCalories(form),
      proteinG: amount(form.protein),
      carbsG: amount(form.carbs),
      fatsG: amount(form.fats),
      ...composition,
    },
    error: null,
  };
}
