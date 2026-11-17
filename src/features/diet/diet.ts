import {
  counterpart,
  normalizeText,
  nutrientsFor,
  searchFoods,
  sumNutrients,
  type Food,
  type Nutrients,
} from "@/src/features/nutrition/foods";
import type { MealDraft, MealSlot } from "@/src/features/nutrition/meals";
import { parseTime } from "@/src/lib/time";

/**
 * La dieta de la persona: qué come en cada comida del día, con sus cantidades.
 * Puede tener un día único o uno para los días de entreno y otro para los de
 * descanso. Se escribe o se pega como texto (o CSV) y se enlaza con los
 * alimentos de la app para saber sus calorías y macros. Se guarda en ajustes
 * (`diet_plan`) y viaja en el respaldo. Módulo puro.
 */
export const DIET_KEY = "diet_plan";

export type DietItem = MealDraft & {
  /** No se encontró el alimento: hay que elegirlo a mano. */
  unknown?: boolean;
  /** El alimento existe crudo y cocido y el texto no decía cuál. */
  ambiguous?: boolean;
};
export type DietMeal = {
  slot: MealSlot;
  label: string;
  time?: string;
  items: DietItem[];
  /** Etiquetas del archivo de dieta; `pre_gym` y `post_gym` marcan la comida de antes y después de entrenar. */
  tags?: string[];
};
export type DayKind = "any" | "training" | "rest";
export type DietDay = {
  kind: DayKind;
  meals: DietMeal[];
  /** Día de la semana ("mon"…"sun") cuando la dieta trae un horario distinto para cada día. */
  weekday?: string;
  /** Hora del gimnasio de ese día, si la dieta la trae. */
  gym?: { start: string; end?: string };
};
export type DietPlan = {
  name: string;
  days: DietDay[];
  createdAt: string;
  /** Metas que trae la propia dieta: mandan sobre las del plan al seguirla. */
  targets?: { kcal: number; proteinG: number; carbsG: number; fatsG: number };
  rules?: string[];
  notes?: string;
};

/** La dieta trae un horario por día de la semana (y no un día único o entreno/descanso). */
export const isWeekly = (plan: DietPlan) => plan.days.some((day) => day.weekday);

export const DAY_KIND_LABELS: Record<DayKind, string> = {
  any: "Todos los días",
  training: "Día de entreno",
  rest: "Día de descanso",
};

/** El día de la dieta que toca: el de entreno o descanso si existe; si no, el general. */
export function dietDayFor(plan: DietPlan, trainingDay: boolean, weekday?: string): DietDay | null {
  // Con horario semanal, el día es el de hoy; si hoy no tiene, no hay dieta que seguir.
  if (isWeekly(plan)) return plan.days.find((day) => day.weekday === weekday) ?? null;
  const wanted: DayKind = trainingDay ? "training" : "rest";
  return (
    plan.days.find((day) => day.kind === wanted) ??
    plan.days.find((day) => day.kind === "any") ??
    plan.days[0] ??
    null
  );
}

export const mealTotals = (meal: DietMeal): Nutrients => sumNutrients(meal.items);
export const dayTotals = (day: DietDay): Nutrients => sumNutrients(day.meals.flatMap((meal) => meal.items));

/** Un ítem de dieta a partir de un alimento y sus gramos. */
export const itemFromFood = (food: Food, grams: number): DietItem => ({
  foodId: food.id,
  name: food.name,
  grams,
  ...nutrientsFor(food, grams),
});

/** El mismo ítem con otra cantidad. */
export function scaleItem(item: DietItem, factor: number): DietItem {
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const grams = item.grams ? Math.max(5, Math.round((item.grams * factor) / 5) * 5) : undefined;
  const real = item.grams && grams ? grams / item.grams : factor;
  return {
    ...item,
    ...(grams ? { grams } : {}),
    kcal: Math.round(item.kcal * real),
    proteinG: round1(item.proteinG * real),
    carbsG: round1(item.carbsG * real),
    fatsG: round1(item.fatsG * real),
  };
}

// ---- Leer una dieta escrita ----

const SLOT_ORDER: MealSlot[] = ["breakfast", "midmorning", "lunch", "snack", "dinner", "latenight"];
const HEADERS: Array<[RegExp, MealSlot | null]> = [
  [/^desayuno/, "breakfast"],
  [/^(media manana|colacion|merienda de la manana|segundo desayuno)/, "midmorning"],
  [/^almuerzo/, "lunch"],
  [/^(merienda|snack|lonche|media tarde|once)/, "snack"],
  [/^cena/, "dinner"],
  [/^(antes de dormir|recena|noche)/, "latenight"],
  [/^(pre ?entreno|post ?entreno|preentreno|postentreno|comida|refrigerio)/, null],
];
const DAY_HEADERS: Array<[RegExp, DayKind]> = [
  [/^(dia de )?(entreno|entrenamiento)\b/, "training"],
  [/^(dia de )?descanso\b/, "rest"],
];

// Gramos de las medidas caseras que no dependen del alimento.
const UNIT_GRAMS: Record<string, number> = {
  g: 1,
  gr: 1,
  grs: 1,
  gramo: 1,
  gramos: 1,
  ml: 1,
  cc: 1,
  kg: 1000,
  l: 1000,
  litro: 1000,
  cucharada: 15,
  cucharadas: 15,
  cda: 15,
  cdas: 15,
  cucharadita: 5,
  cucharaditas: 5,
  cdta: 5,
  cdtas: 5,
  taza: 240,
  tazas: 240,
  vaso: 240,
  vasos: 240,
};
// Medidas que usan la porción del alimento (una unidad, una rebanada, un scoop).
const SERVING_UNITS =
  /^(unidad|unidades|u|und|pieza|piezas|porcion|porciones|rebanada|rebanadas|tajada|tajadas|scoop|scoops|lata|latas|filete|filetes|huevo|huevos)$/;

const NUMBER = "(\\d+(?:[.,]\\d+)?|\\d+\\s*/\\s*\\d+|un|una|medio|media)";
const UNIT = "([a-z]+)";
const toNumber = (text: string): number => {
  const clean = text.trim();
  if (/^(un|una)$/.test(clean)) return 1;
  if (/^(medio|media)$/.test(clean)) return 0.5;
  const fraction = clean.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(clean.replace(",", "."));
};

type Quantity = { name: string; amount: number; unit: string | null };

// Minúsculas y sin tildes, pero conservando los números con decimales y fracciones.
const plain = (line: string) =>
  line
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.,/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
// Alimentos que en una dieta se pesan secos aunque exista su versión cocida.
const RAW_BY_DEFAULT = /avena|harina|kiwicha/;

/** Separa "Avena 60 g", "60 g de avena", "2 huevos" o "1 taza de arroz" en nombre, cantidad y unidad. */
export function splitQuantity(line: string): Quantity {
  const text = plain(line);
  // "60 g de avena", "1 taza de arroz", "2 huevos"
  let match = text.match(new RegExp(`^${NUMBER}\\s*${UNIT}?\\s+(?:de\\s+)?(.+)$`));
  if (match) {
    const unit = match[2] && (UNIT_GRAMS[match[2]] || SERVING_UNITS.test(match[2])) ? match[2] : null;
    const name = unit ? match[3] : `${match[2] ?? ""} ${match[3]}`.trim();
    return { name, amount: toNumber(match[1]), unit };
  }
  // "avena 60 g", "platano 1 unidad", "huevo 2"
  match = text.match(new RegExp(`^(.+?)\\s+${NUMBER}\\s*${UNIT}?$`));
  if (match) {
    const unit = match[3] && (UNIT_GRAMS[match[3]] || SERVING_UNITS.test(match[3])) ? match[3] : null;
    return { name: match[1], amount: toNumber(match[2]), unit };
  }
  return { name: text, amount: 1, unit: null };
}

/** Busca el alimento de un nombre escrito, probando con menos palabras si no aparece. */
export function matchFood(name: string, foods: Food[]): Food | null {
  const words = normalizeText(name)
    .split(" ")
    .filter((word) => word && !["de", "del", "la", "el", "con", "en", "y", "al", "a"].includes(word))
    // La forma de cocinar o el tamaño no cambian de qué alimento se trata.
    .filter(
      (word) => !/^(plancha|horno|hervid|asad|sancochad|vapor|grande|median|pequen|parrilla)/.test(word),
    );
  // Con varias palabras no se acepta coincidir solo con la primera ("fruta del dragón" no es "tuna (fruta)").
  const least = words.length >= 2 ? 2 : 1;
  // También en singular: "huevos" → "huevo", "nueces" → "nuec" (la búsqueda es por inicio de palabra).
  const stems = [
    (word: string) => word,
    (word: string) => (word.length > 3 ? word.replace(/s$/, "") : word),
    (word: string) => (word.length > 4 ? word.replace(/es$/, "") : word),
  ];
  const wantsRaw = /crud/.test(normalizeText(name)) || RAW_BY_DEFAULT.test(normalizeText(name));
  for (let size = words.length; size >= least; size -= 1)
    for (const stem of stems) {
      const found = searchFoods(foods, words.slice(0, size).map(stem).join(" "), {}, 12);
      // Entre crudo y cocido se prefiere el cocido, salvo que el texto diga otra cosa.
      if (found.length)
        return (
          found.find((food) => !food.state || (wantsRaw ? food.state === "raw" : food.state === "cooked")) ??
          found[0]
        );
    }
  return null;
}

/** Convierte una línea de la dieta en un ítem enlazado a un alimento. */
export function parseItem(line: string, foods: Food[]): DietItem {
  const quantity = splitQuantity(line);
  const food = matchFood(quantity.name, foods);
  const original = line.replace(/^[\s·•*\-–—]+/, "").trim();
  if (!food) return { name: original, kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0, unknown: true };
  const perUnit = quantity.unit ? (UNIT_GRAMS[quantity.unit] ?? food.servingG) : food.servingG;
  const grams = Math.max(1, Math.round(quantity.amount * perUnit));
  const said = /crud|cocid|hervid|plancha|horno|asad|frit/.test(normalizeText(line));
  return {
    ...itemFromFood(food, grams),
    ...(food.pair && !said && counterpart(food, foods) ? { ambiguous: true } : {}),
  };
}

export type DietParse = { plan: DietPlan; unknown: number; ambiguous: number };

/**
 * Lee una dieta escrita así:
 *
 *   Desayuno 7:30
 *   - Avena 60 g
 *   - 2 huevos
 *   Almuerzo
 *   - Arroz cocido 200 g
 *
 * Con "Día de entreno" y "Día de descanso" como títulos se separan dos días.
 */
export function parseDietText(text: string, foods: Food[], name = "Mi dieta", createdAt = ""): DietParse {
  const days: DietDay[] = [];
  let day: DietDay | null = null;
  let meal: DietMeal | null = null;
  const openDay = (kind: DayKind) => {
    day = { kind, meals: [] };
    days.push(day);
    meal = null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[·•*\-–—]/.test(line);
    const clean = normalizeText(line.replace(/[:]/g, " "));
    const dayHeader = !bullet ? DAY_HEADERS.find(([pattern]) => pattern.test(clean)) : undefined;
    if (dayHeader) {
      openDay(dayHeader[1]);
      continue;
    }
    const header = !bullet ? HEADERS.find(([pattern]) => pattern.test(clean)) : undefined;
    // Un título también es una línea sin números que termina en ":".
    const looksLikeTitle = !bullet && /:\s*$/.test(line) && !/\d/.test(line.replace(/\d{1,2}[:.h]\d{2}/, ""));
    if (header || looksLikeTitle) {
      if (!day) openDay("any");
      const current: DietDay = day as unknown as DietDay;
      const used = new Set(current.meals.map((item) => item.slot));
      const hinted = header?.[1] ?? null;
      const slot =
        hinted && !used.has(hinted)
          ? hinted
          : (SLOT_ORDER.find((candidate) => !used.has(candidate)) ?? `meal${current.meals.length + 1}`);
      const timeText = line.match(/(\d{1,2})[:.h](\d{2})/);
      const minutes = timeText ? parseTime(`${timeText[1]}:${timeText[2]}`) : null;
      const label = line
        .replace(/(\d{1,2})[:.h](\d{2}).*$/, "")
        .replace(/[:\-–—(]+\s*$/, "")
        .trim();
      meal = {
        slot,
        label: label || "Comida",
        ...(minutes !== null && timeText ? { time: `${timeText[1].padStart(2, "0")}:${timeText[2]}` } : {}),
        items: [],
      };
      current.meals.push(meal);
      continue;
    }
    if (!day) openDay("any");
    if (!meal) {
      meal = { slot: "breakfast", label: "Comida 1", items: [] };
      (day as unknown as DietDay).meals.push(meal);
    }
    (meal as DietMeal).items.push(parseItem(line, foods));
  }
  const clean = days
    .map((item) => ({ ...item, meals: item.meals.filter((entry) => entry.items.length) }))
    .filter((item) => item.meals.length);
  const items = clean.flatMap((item) => item.meals.flatMap((entry) => entry.items));
  return {
    plan: { name, days: clean, createdAt },
    unknown: items.filter((item) => item.unknown).length,
    ambiguous: items.filter((item) => item.ambiguous).length,
  };
}

/** La dieta como texto, en el mismo formato que se lee. */
export function dietToText(plan: DietPlan): string {
  return plan.days
    .map((day) =>
      [
        ...(plan.days.length > 1 || day.kind !== "any" ? [DAY_KIND_LABELS[day.kind]] : []),
        ...day.meals.flatMap((meal) => [
          `${meal.label}${meal.time ? ` ${meal.time}` : ""}`,
          ...meal.items.map((item) => `- ${item.name}${item.grams ? ` ${item.grams} g` : ""}`),
        ]),
      ].join("\n"),
    )
    .join("\n\n");
}

const isItem = (value: unknown): value is DietItem =>
  Boolean(value) &&
  typeof (value as DietItem).name === "string" &&
  typeof (value as DietItem).kcal === "number" &&
  typeof (value as DietItem).proteinG === "number";

/** Lee la dieta guardada; null si no sirve. */
export function readDiet(value: unknown): DietPlan | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<DietPlan>;
  if (typeof raw.name !== "string" || !Array.isArray(raw.days)) return null;
  const days = raw.days.flatMap((day): DietDay[] => {
    if (!day || !Array.isArray(day.meals)) return [];
    const meals = day.meals.flatMap((meal): DietMeal[] => {
      if (!meal || typeof meal.slot !== "string" || !Array.isArray(meal.items)) return [];
      const items = meal.items.filter(isItem);
      return items.length
        ? [
            {
              slot: meal.slot,
              label: typeof meal.label === "string" ? meal.label : "Comida",
              ...(typeof meal.time === "string" ? { time: meal.time } : {}),
              items,
              ...(Array.isArray(meal.tags)
                ? { tags: meal.tags.filter((tag): tag is string => typeof tag === "string") }
                : {}),
            },
          ]
        : [];
    });
    const kind: DayKind = day.kind === "training" || day.kind === "rest" ? day.kind : "any";
    return meals.length
      ? [
          {
            kind,
            meals,
            ...(typeof day.weekday === "string" ? { weekday: day.weekday } : {}),
            ...(day.gym && typeof day.gym.start === "string"
              ? {
                  gym: {
                    start: day.gym.start,
                    ...(typeof day.gym.end === "string" ? { end: day.gym.end } : {}),
                  },
                }
              : {}),
          },
        ]
      : [];
  });
  return days.length
    ? {
        name: raw.name,
        days,
        createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
        ...(raw.targets && typeof raw.targets.kcal === "number" ? { targets: raw.targets } : {}),
        ...(Array.isArray(raw.rules)
          ? { rules: raw.rules.filter((rule): rule is string => typeof rule === "string") }
          : {}),
        ...(typeof raw.notes === "string" ? { notes: raw.notes } : {}),
      }
    : null;
}

/** Cambia (o quita, con null) un ítem de la dieta. Las comidas y días que quedan vacíos se quitan. */
export function replaceItem(
  plan: DietPlan,
  at: { day: number; meal: number; item: number },
  next: DietItem | null,
): DietPlan {
  const days = plan.days
    .map((day, dayIndex) =>
      dayIndex !== at.day
        ? day
        : {
            ...day,
            meals: day.meals
              .map((meal, mealIndex) =>
                mealIndex !== at.meal
                  ? meal
                  : {
                      ...meal,
                      items: meal.items.flatMap((item, itemIndex) =>
                        itemIndex !== at.item ? [item] : next ? [next] : [],
                      ),
                    },
              )
              .filter((meal) => meal.items.length),
          },
    )
    .filter((day) => day.meals.length);
  return { ...plan, days };
}

/** El mismo ítem en su otra versión (crudo ↔ cocido), con los mismos gramos escritos. */
export function otherState(item: DietItem, foods: Food[]): DietItem | null {
  const food = foods.find((entry) => entry.id === item.foodId);
  const other = food ? counterpart(food, foods) : null;
  return other && item.grams ? itemFromFood(other, item.grams) : null;
}

/** Cuántos ítems faltan por resolver antes de poder confiar en los totales. */
export const unresolved = (plan: DietPlan) =>
  plan.days.flatMap((day) => day.meals.flatMap((meal) => meal.items)).filter((item) => item.unknown).length;
