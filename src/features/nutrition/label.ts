import { caloriesFromMacros } from "@/src/features/nutrition/foods";

/**
 * Leer una etiqueta nutricional a partir de su texto (pegado, o el que da el
 * reconocimiento de texto de la cámara cuando llegue con el APK). Encuentra la
 * porción, las calorías y los tres macros, por porción o por 100 g, y revisa
 * que cuadren: si las calorías no coinciden con 4·P + 4·C + 9·G, busca el dato
 * que probablemente se leyó mal (una coma perdida: 2,1 leído como 21) y lo
 * marca para revisarlo. Módulo puro.
 */
export type LabelField = "kcal" | "protein" | "carbs" | "fats";
export type LabelReading = {
  servingG: number | null;
  /** Valores por porción si la etiqueta los trae; si no, por 100 g. */
  basis: "serving" | "100g";
  values: Partial<Record<LabelField, number>>;
  /** Campos a revisar a mano. */
  suspicious: LabelField[];
  /** Arreglo propuesto para un dato mal leído. */
  fix: { field: LabelField; value: number } | null;
};

const plain = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const PATTERNS: Record<LabelField, RegExp> = {
  kcal: /(?:energia|valor energetico|calorias|kcal)[^\d\n]*(\d+(?:[.,]\d+)?)\s*(?:kcal)?/,
  protein: /proteinas?[^\d\n]*(\d+(?:[.,]\d+)?)/,
  carbs: /(?:carbohidratos|hidratos de carbono|carbohidrato)(?: totales)?[^\d\n]*(\d+(?:[.,]\d+)?)/,
  fats: /(?:grasas? totales?|grasas?|lipidos)[^\d\n]*(\d+(?:[.,]\d+)?)/,
};

const number = (text: string) => Number(text.replace(",", "."));

/** El primer número de cada renglón que nombra el campo (la columna "por porción" o la única). */
export function readLabel(text: string): LabelReading {
  const lines = plain(text).split(/\r?\n/);
  const values: Partial<Record<LabelField, number>> = {};
  for (const field of Object.keys(PATTERNS) as LabelField[]) {
    for (const line of lines) {
      // "Grasas saturadas" y "azúcares" no son el total.
      if (field === "fats" && /saturad|trans|mono|poli/.test(line)) continue;
      if (field === "carbs" && /azucar/.test(line) && !/carbohidrat|hidratos/.test(line)) continue;
      // Una línea de kJ no es la de kcal.
      if (field === "kcal" && /kj/.test(line) && !/kcal/.test(line)) continue;
      const match = line.match(PATTERNS[field]);
      if (match) {
        let found = number(match[1]);
        // "Energía 1561 kJ / 373 kcal": se queda con las kcal.
        if (field === "kcal") {
          const kcal = line.match(/(\d+(?:[.,]\d+)?)\s*kcal/);
          if (kcal) found = number(kcal[1]);
        }
        values[field] = found;
        break;
      }
    }
  }
  const serving = plain(text).match(/porcion[^\d\n]*(\d+(?:[.,]\d+)?)\s*(?:g|ml)/);
  const servingG = serving ? number(serving[1]) : null;
  const basis: LabelReading["basis"] =
    /por porcion|porcion/.test(plain(text)) && servingG ? "serving" : "100g";

  const suspicious: LabelField[] = [];
  let fix: LabelReading["fix"] = null;
  const { kcal, protein, carbs, fats } = values;
  if (kcal !== undefined && protein !== undefined && carbs !== undefined && fats !== undefined) {
    const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(15, b * 0.15);
    if (!close(caloriesFromMacros(protein, carbs, fats), kcal)) {
      // Prueba cada macro dividido o multiplicado por 10; se queda con el que hace cuadrar las calorías.
      const tries: Array<{ field: LabelField; value: number }> = [];
      for (const field of ["fats", "carbs", "protein"] as const)
        for (const factor of [0.1, 10])
          tries.push({ field, value: Math.round(values[field]! * factor * 10) / 10 });
      fix =
        tries.find((attempt) => {
          const next = { protein, carbs, fats, [attempt.field]: attempt.value };
          return close(caloriesFromMacros(next.protein, next.carbs, next.fats), kcal);
        }) ?? null;
      suspicious.push(...(fix ? [fix.field] : (["kcal", "protein", "carbs", "fats"] as LabelField[])));
    }
  } else
    for (const field of ["kcal", "protein", "carbs", "fats"] as LabelField[])
      if (values[field] === undefined) suspicious.push(field);
  return { servingG, basis, values, suspicious, fix };
}
