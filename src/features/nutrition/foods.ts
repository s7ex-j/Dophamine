/**
 * Alimentos: qué es uno, cómo se calcula una porción, cómo se buscan y cómo se
 * arma una receta. Módulo puro; guardar y leer es de `nutrition.repository`.
 *
 * Todos los valores nutricionales se guardan por 100 g, que es como vienen en
 * las etiquetas y en las tablas de composición.
 */
export type FoodSource =
  /** Incluido en la app. */
  | "builtin"
  /** Creado por la persona con sus propios valores. */
  | "custom"
  /** Receta: varios alimentos con un rendimiento en porciones. */
  | "recipe"
  /** Traído de Open Food Facts (búsqueda en línea o código de barras) y guardado. */
  | "off";

/** Si el peso es del alimento crudo o ya cocido. Solo lo tienen los que cambian al cocinarse. */
export type FoodState = "raw" | "cooked";
export const stateLabels: Record<FoodState, string> = { raw: "Crudo", cooked: "Cocido" };

export type Nutrients = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  /** Gramos de alcohol (7 kcal/g). Va aparte: no es un macronutriente. Solo se guarda si hay. */
  alcoholG?: number;
};
export type RecipeIngredient = { foodId: string; name: string; grams: number } & Nutrients;

export type Food = {
  id: string;
  source: FoodSource;
  name: string;
  brand?: string;
  barcode?: string;
  /** Gramos de una porción habitual (una unidad, una taza, una porción de receta). */
  servingG: number;
  servingLabel?: string;
  per100: Nutrients;
  ingredients?: RecipeIngredient[];
  state?: FoodState;
  /** Clave que comparten la versión cruda y la cocida del mismo alimento. */
  pair?: string;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export const sourceLabels: Record<FoodSource, string> = {
  builtin: "Básico",
  custom: "Mío",
  recipe: "Receta",
  off: "Open Food Facts",
};

/** Nutrientes de una cantidad en gramos de un alimento. */
export function nutrientsFor(food: Pick<Food, "per100">, grams: number): Nutrients {
  const factor = Math.max(0, grams) / 100;
  return {
    kcal: Math.round(food.per100.kcal * factor),
    proteinG: round1(food.per100.proteinG * factor),
    carbsG: round1(food.per100.carbsG * factor),
    fatsG: round1(food.per100.fatsG * factor),
    ...(food.per100.alcoholG ? { alcoholG: round1(food.per100.alcoholG * factor) } : {}),
  };
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  const alcoholG = round1(items.reduce((total, item) => total + (item.alcoholG ?? 0), 0));
  return {
    kcal: Math.round(items.reduce((total, item) => total + item.kcal, 0)),
    proteinG: round1(items.reduce((total, item) => total + item.proteinG, 0)),
    carbsG: round1(items.reduce((total, item) => total + item.carbsG, 0)),
    fatsG: round1(items.reduce((total, item) => total + item.fatsG, 0)),
    ...(alcoholG > 0 ? { alcoholG } : {}),
  };
}

/** Texto en minúsculas y sin tildes, para que "plátano" y "platano" sean lo mismo al buscar. */
export const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Busca por palabras: todas las del texto deben aparecer en el nombre o la
 * marca. Ordena primero los que empiezan con lo buscado, luego los que la
 * persona usa más (`usage`: veces registrado por id) y los nombres más cortos.
 */
export function searchFoods(
  foods: Food[],
  query: string,
  usage: Record<string, number> = {},
  limit = 40,
): Food[] {
  const words = normalizeText(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const scored = foods.flatMap((food) => {
    const name = normalizeText(food.name);
    const haystack = `${name} ${normalizeText(food.brand ?? "")}`;
    if (!words.every((word) => haystack.includes(word))) return [];
    const first = words[0];
    const position = name.startsWith(first)
      ? 0
      : name.split(" ").some((part) => part.startsWith(first))
        ? 1
        : 2;
    const mine = food.source === "builtin" ? 1 : 0;
    return [{ food, key: [position, -(usage[food.id] ?? 0), mine, name.length] }];
  });
  scored.sort((a, b) => {
    for (let index = 0; index < a.key.length; index += 1)
      if (a.key[index] !== b.key[index]) return a.key[index] - b.key[index];
    return a.food.name.localeCompare(b.food.name);
  });
  return scored.slice(0, limit).map((item) => item.food);
}

// Formulario de "alimento propio". Los valores se escriben por porción, como en una etiqueta.
export type CustomFoodForm = {
  name: string;
  brand: string;
  servingG: string;
  kcal: string;
  protein: string;
  carbs: string;
  fats: string;
};

export const emptyCustomFood = (): CustomFoodForm => ({
  name: "",
  brand: "",
  servingG: "100",
  kcal: "",
  protein: "",
  carbs: "",
  fats: "",
});

const amount = (text: string) => (Number(text) > 0 ? Number(text) : 0);

/** 4 kcal por gramo de proteína y de carbohidrato, 9 por gramo de grasa. */
export const caloriesFromMacros = (proteinG: number, carbsG: number, fatsG: number, alcoholG = 0) =>
  Math.round(proteinG * 4 + carbsG * 4 + fatsG * 9 + alcoholG * 7);

export type CustomFoodResult = { food: Food; error: null } | { food: null; error: string };

/** Valida el formulario y arma el alimento. Las calorías vacías se calculan de los macros. */
export function buildCustomFood(form: CustomFoodForm, id: string): CustomFoodResult {
  const name = form.name.trim();
  if (!name) return { food: null, error: "Ponle un nombre al alimento." };
  const servingG = amount(form.servingG);
  if (servingG <= 0 || servingG > 2000)
    return { food: null, error: "Escribe cuántos gramos tiene una porción (entre 1 y 2000)." };
  const protein = amount(form.protein);
  const carbs = amount(form.carbs);
  const fats = amount(form.fats);
  const kcal = amount(form.kcal) || caloriesFromMacros(protein, carbs, fats);
  if (kcal <= 0) return { food: null, error: "Escribe las calorías o al menos un macronutriente." };
  if (protein + carbs + fats > servingG)
    return { food: null, error: "Los macros suman más gramos que la porción. Revisa los valores." };
  const per100 = (value: number) => round1((value / servingG) * 100);
  return {
    food: {
      id,
      source: "custom",
      name,
      ...(form.brand.trim() ? { brand: form.brand.trim() } : {}),
      servingG,
      per100: { kcal: per100(kcal), proteinG: per100(protein), carbsG: per100(carbs), fatsG: per100(fats) },
    },
    error: null,
  };
}

/**
 * Arma una receta: el total de sus ingredientes dividido entre las porciones
 * que rinde. Queda como un alimento más, con su porción en gramos.
 */
export function buildRecipe(
  name: string,
  servings: number,
  ingredients: RecipeIngredient[],
  id: string,
): CustomFoodResult {
  if (!name.trim()) return { food: null, error: "Ponle un nombre a la receta." };
  if (!ingredients.length) return { food: null, error: "Agrega al menos un ingrediente al plato." };
  if (!(servings > 0 && servings <= 100)) return { food: null, error: "Escribe cuántas porciones rinde." };
  const totalG = ingredients.reduce((total, item) => total + item.grams, 0);
  if (totalG <= 0)
    return {
      food: null,
      error: "Una receta necesita ingredientes con peso: el registro rápido no sirve aquí.",
    };
  const total = sumNutrients(ingredients);
  const per100 = (value: number) => round1((value / totalG) * 100);
  return {
    food: {
      id,
      source: "recipe",
      name: name.trim(),
      servingG: round1(totalG / servings),
      servingLabel: "porción",
      per100: {
        kcal: per100(total.kcal),
        proteinG: per100(total.proteinG),
        carbsG: per100(total.carbsG),
        fatsG: per100(total.fatsG),
      },
      ingredients,
    },
    error: null,
  };
}

/** "165 kcal · P 31 · C 0 · G 3.6" */
export const describeNutrients = (nutrients: Nutrients) =>
  `${nutrients.kcal} kcal · P ${nutrients.proteinG} · C ${nutrients.carbsG} · G ${nutrients.fatsG}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNutrients = (value: unknown) =>
  isRecord(value) &&
  ["kcal", "proteinG", "carbsG", "fatsG"].every(
    (key) => Number.isFinite(value[key]) && (value[key] as number) >= 0,
  );

/** Comprueba la forma de un alimento leído de un respaldo. */
export function isFood(value: unknown): value is Food {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    ["builtin", "custom", "recipe", "off"].includes(value.source as string) &&
    Number.isFinite(value.servingG) &&
    (value.servingG as number) > 0 &&
    isNutrients(value.per100)
  );
}

/** La otra versión (cruda o cocida) del mismo alimento, si existe. */
export function counterpart(food: Food, foods: Food[]): Food | null {
  if (!food.pair || !food.state) return null;
  return foods.find((item) => item.pair === food.pair && item.state && item.state !== food.state) ?? null;
}

/**
 * Cuántos gramos de la otra versión equivalen a una cantidad: los que aportan
 * las mismas calorías. 60 g de arroz crudo ≈ 168 g de arroz cocido.
 */
export function equivalentGrams(from: Food, to: Food, grams: number): number {
  if (!(to.per100.kcal > 0) || !(grams > 0)) return 0;
  return Math.round((grams * from.per100.kcal) / to.per100.kcal);
}
