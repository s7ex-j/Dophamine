import {
  itemFromFood,
  scaleItem,
  type DietDay,
  type DietItem,
  type DietMeal,
} from "@/src/features/diet/diet";
import { ALLERGEN_LABELS, TRAIT_LABELS, tagsOf, type Trait } from "@/src/features/health/foodTags";
import { conditionById, foodFit, type HealthProfile } from "@/src/features/health/health";
import { normalizeText, sumNutrients, type Food, type Nutrients } from "@/src/features/nutrition/foods";
import type { MealEntry } from "@/src/features/nutrition/meals";
import { formatTime, parseTime } from "@/src/lib/time";

/**
 * El asesor de la dieta. Con la dieta del día, lo ya anotado, la hora, el
 * entreno (a qué hora toca o si ya se hizo), cómo se siente la persona y su
 * perfil de salud, decide:
 *
 * - qué comida toca y cuáles ya se hicieron;
 * - qué preguntar (la hora del entreno);
 * - qué cambiar: alérgenos (obligatorio), la comida de antes y después de
 *   entrenar, ajustes por energía, sueño o estrés, alimentos que conviene
 *   limitar o incluir por una condición, y el resto del día si lo comido se
 *   apartó del plan.
 *
 * Los cambios se proponen con equivalentes: otro alimento del mismo tipo, en la
 * cantidad que da el mismo macronutriente principal. Nada se aplica solo.
 * Módulo puro.
 */
export const DAY_STATE_KEY = "diet_day_state";

export type DayState = {
  date: string;
  /** Minutos desde medianoche del entreno de hoy; null = aún sin responder. */
  trainTime?: number | null;
  trained?: boolean;
  noTraining?: boolean;
  /** Cambios de hoy sobre la dieta: ítem `index` de la comida `slot`. */
  swaps: Array<{ slot: string; index: number; item: DietItem }>;
  /** Factor aplicado a las comidas que faltan. */
  scale?: number;
};

export const readDayState = (value: unknown, date: string): DayState => {
  const state = value as Partial<DayState> | null;
  return state && state.date === date && Array.isArray(state.swaps)
    ? (state as DayState)
    : { date, swaps: [] };
};

const SLOT_MINUTES: Record<string, number> = {
  breakfast: 7 * 60,
  midmorning: 10 * 60,
  lunch: 13 * 60,
  snack: 17 * 60,
  dinner: 20 * 60,
  latenight: 22 * 60,
};

/** A qué hora es una comida: la escrita en la dieta o la habitual de su momento. */
export function mealMinutes(meal: Pick<DietMeal, "slot" | "time">, index = 0, count = 1): number {
  const written = meal.time ? parseTime(meal.time) : null;
  if (written !== null) return written;
  if (SLOT_MINUTES[meal.slot] !== undefined) return SLOT_MINUTES[meal.slot];
  return count <= 1 ? 13 * 60 : Math.round(7 * 60 + (14 * 60 * index) / (count - 1));
}

export type Role = "protein" | "carbs" | "fats" | "veg";

/** El papel de un alimento en el plato: de dónde sale la mayor parte de sus calorías. */
export function roleOf(nutrients: Nutrients, kcalPer100?: number): Role {
  const total = nutrients.proteinG * 4 + nutrients.carbsG * 4 + nutrients.fatsG * 9;
  if (total <= 0) return "veg";
  if (kcalPer100 !== undefined && kcalPer100 < 45 && nutrients.proteinG * 4 < total * 0.45) return "veg";
  if ((nutrients.fatsG * 9) / total > 0.55) return "fats";
  if ((nutrients.proteinG * 4) / total >= 0.35) return "protein";
  return "carbs";
}

type Group = "fruit" | "vegetable" | "starch" | "legume" | "dairy" | "animal" | "nut" | "oil" | "other";
const GROUPS: Array<[Group, RegExp]> = [
  ["oil", /aceite|mantequilla|margarina|mayonesa|crema de leche/],
  ["dairy", /leche|yogur|queso|requeson|cottage/],
  ["legume", /lenteja|frejol|frijol|garbanzo|pallar|haba|arveja|soya|tarwi|tofu|hummus/],
  [
    "animal",
    /pollo|pavo|\bres\b|cerdo|cordero|higado|corazon|jamon|huevo|clara|salmon|trucha|bonito|jurel|caballa|tilapia|pescado|atun|sardina|camaron|pota|proteina/,
  ],
  ["nut", /\bmani\b|almendra|nuez|nueces|castana|pecana|pistacho|caju|chia|linaza|girasol|ajonjoli|coco/],
  [
    "starch",
    /arroz|avena|quinua|fideo|pasta|trigo|kiwicha|\bpan\b|tortilla|galleta|cereal|granola|cancha|maiz|\bpapa\b|camote|yuca|choclo|platano verde|harina/,
  ],
  [
    "fruit",
    /platano|manzana|naranja|mandarina|papaya|pina|mango|sandia|melon|uva|fresa|arandano|pera|durazno|kiwi|granadilla|maracuya|chirimoya|lucuma|tuna|aguaymanto|palta|pasas|datil/,
  ],
  [
    "vegetable",
    /tomate|lechuga|cebolla|zanahoria|brocoli|coliflor|espinaca|zapallo|vainita|betarraga|pepino|pimiento|zucchini|col\b|apio|champinon|esparrago|berenjena|alcachofa/,
  ],
];
const groupOf = (name: string): Group => {
  const text = normalizeText(name);
  return GROUPS.find(([, pattern]) => pattern.test(text))?.[0] ?? "other";
};

const round5 = (value: number) => Math.max(10, Math.round(value / 5) * 5);
const dominant = (role: Role, nutrients: Nutrients) =>
  role === "protein"
    ? nutrients.proteinG
    : role === "carbs"
      ? nutrients.carbsG
      : role === "fats"
        ? nutrients.fatsG
        : nutrients.kcal;

const fitOfItem = (item: DietItem, health: HealthProfile) =>
  foodFit(
    { name: item.name, per100: { kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0, alcoholG: item.alcoholG } },
    health,
  );

// Lo que no se propone como reemplazo salvo que el original ya lo fuera.
const JUNK: Trait[] = ["sugar", "fried", "alcohol", "processedMeat"];

export type EquivalentOptions = {
  foods: Food[];
  health: HealthProfile;
  /** Alimentos que ya están en la dieta: se prefieren. */
  dietFoodIds?: string[];
  /** Características que se quieren evitar o conseguir en el reemplazo. */
  avoid?: Trait[];
  want?: Trait[];
  /** Papel que debe tener el reemplazo (por defecto, el del original). */
  role?: Role;
  limit?: number;
};

/**
 * Equivalentes de un ítem: alimentos del mismo papel, en la cantidad que da el
 * mismo macronutriente principal y calorías parecidas, que la persona puede
 * comer. Ordenados: mismo grupo de alimento, ya en la dieta, mejor para su salud.
 */
export function equivalents(item: DietItem, options: EquivalentOptions): DietItem[] {
  const { foods, health, dietFoodIds = [], avoid = [], want = [], limit = 4 } = options;
  const original = foods.find((food) => food.id === item.foodId);
  const itemRole = roleOf(item, original?.per100.kcal);
  const role = options.role ?? itemRole;
  const amount = dominant(role === itemRole ? role : "veg", item);
  const group = groupOf(item.name);
  const originalTraits = tagsOf(
    original ?? { name: item.name, per100: { kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0 } },
  ).traits;
  const inDiet = new Set(dietFoodIds);
  const scored = foods.flatMap((food) => {
    if (food.id === item.foodId || (original?.pair && food.pair === original.pair)) return [];
    if (food.state === "raw" && original?.state !== "raw") return [];
    if (food.per100.kcal <= 0 || roleOf(food.per100, food.per100.kcal) !== role) return [];
    const fit = foodFit(food, health);
    if (fit.blocked.length) return [];
    const traits = tagsOf(food).traits;
    if (traits.some((trait) => JUNK.includes(trait) && !originalTraits.includes(trait))) return [];
    if (avoid.some((trait) => traits.includes(trait))) return [];
    if (want.length && !want.some((trait) => traits.includes(trait))) return [];
    const perGram = dominant(role === itemRole ? role : "veg", food.per100) / 100;
    if (perGram <= 0) return [];
    const grams = round5(amount / perGram);
    if (grams > 700) return [];
    const next = itemFromFood(food, grams);
    const ratio = item.kcal > 0 ? next.kcal / item.kcal : 1;
    if (ratio < 0.65 || ratio > 1.4) return [];
    const score =
      (groupOf(food.name) === group ? 3 : 0) +
      (inDiet.has(food.id) ? 1.5 : 0) +
      fit.score * 1.5 +
      want.filter((trait) => traits.includes(trait)).length * 2 -
      Math.abs(1 - ratio) * 3 +
      (food.source === "builtin" ? 0 : 0.5);
    return [{ next, score }];
  });
  return scored
    .sort((a, b) => b.score - a.score || a.next.name.localeCompare(b.next.name))
    .slice(0, limit)
    .map((entry) => entry.next);
}

export type CoachMeal = DietMeal & {
  minutes: number;
  status: "done" | "next" | "pending";
  /** Antes o después del entreno de hoy. */
  around?: "pre" | "post";
  totals: Nutrients;
};

export type Advice = {
  id: string;
  kind: "allergy" | "timing" | "feeling" | "health" | "balance";
  title: string;
  detail: string;
  /** Cambiar un ítem de una comida por otro. */
  swap?: { slot: string; index: number; item: DietItem };
  /** Multiplicar las comidas que faltan por este factor. */
  scale?: number;
};

export type Feeling = { energy?: number | null; stress?: number | null; sleepMinutes?: number | null };

export type CoachInput = {
  day: DietDay;
  state: DayState;
  logged: MealEntry[];
  /** Minutos desde medianoche. */
  now: number;
  /** Hoy toca entrenar según la rutina. */
  trainingDay: boolean;
  feeling: Feeling;
  health: HealthProfile;
  foods: Food[];
  targets: { calories: number; protein: number };
};

export type Coach = {
  meals: CoachMeal[];
  next: CoachMeal | null;
  /** Hay que preguntar a qué hora entrena hoy. */
  askTraining: boolean;
  advice: Advice[];
  planned: Nutrients;
  consumed: Nutrients;
  projected: Nutrients;
};

/** La dieta del día con los cambios de hoy aplicados (reemplazos y factor en lo que falta). */
export function applyDayState(day: DietDay, state: DayState, doneSlots: string[] = []): DietDay {
  return {
    ...day,
    meals: day.meals.map((meal) => {
      const done = doneSlots.includes(meal.slot);
      return {
        ...meal,
        items: meal.items.map((item, index) => {
          const swap = state.swaps.find((entry) => entry.slot === meal.slot && entry.index === index);
          const current = swap ? swap.item : item;
          return !done && state.scale && state.scale !== 1 ? scaleItem(current, state.scale) : current;
        }),
      };
    }),
  };
}

const list = (traits: Trait[]) => traits.map((trait) => TRAIT_LABELS[trait]).join(", ");

export function coach(input: CoachInput): Coach {
  const { state, logged, now, health, foods, targets, feeling } = input;
  const doneSlots = [...new Set(logged.map((entry) => entry.slot))];
  const day = applyDayState(input.day, state, doneSlots);
  const trained = Boolean(state.trained);
  const trainTime = !input.trainingDay || state.noTraining || trained ? null : (state.trainTime ?? null);

  const base = day.meals.map((meal, index) => ({
    ...meal,
    minutes: mealMinutes(meal, index, day.meals.length),
    totals: sumNutrients(meal.items),
  }));
  const pending = base.filter((meal) => !doneSlots.includes(meal.slot));
  const nextMeal = pending.find((meal) => meal.minutes >= now - 90) ?? pending[0] ?? null;
  const pre =
    trainTime === null
      ? null
      : ([...base]
          .reverse()
          .find((meal) => meal.minutes <= trainTime - 30 && meal.minutes >= trainTime - 240) ?? null);
  const post =
    trainTime !== null
      ? (pending.find((meal) => meal.minutes >= trainTime + 30) ?? null)
      : trained
        ? nextMeal
        : null;
  const meals: CoachMeal[] = base.map((meal) => ({
    ...meal,
    status: doneSlots.includes(meal.slot) ? "done" : meal.slot === nextMeal?.slot ? "next" : "pending",
    ...(pre?.slot === meal.slot
      ? { around: "pre" as const }
      : post?.slot === meal.slot
        ? { around: "post" as const }
        : {}),
  }));

  const dietFoodIds = input.day.meals.flatMap((meal) =>
    meal.items.flatMap((item) => (item.foodId ? [item.foodId] : [])),
  );
  const options = { foods, health, dietFoodIds };
  const advice: Advice[] = [];
  const pendingItems = pending.flatMap((meal) => meal.items.map((item, index) => ({ meal, item, index })));
  const touched = new Set<string>();
  const key = (slot: string, index: number) => `${slot}:${index}`;

  // 1. Alergias e intolerancias: lo primero y siempre.
  for (const { meal, item, index } of pendingItems) {
    const blocked = fitOfItem(item, health).blocked;
    if (!blocked.length) continue;
    const alternative = equivalents(item, options)[0];
    touched.add(key(meal.slot, index));
    advice.push({
      id: `allergy-${key(meal.slot, index)}`,
      kind: "allergy",
      title: `${item.name} tiene ${blocked.map((allergen) => ALLERGEN_LABELS[allergen].toLowerCase()).join(" y ")}`,
      detail: alternative
        ? `En ${meal.label.toLowerCase()}, cámbialo por ${alternative.name} (${alternative.grams} g): aporta casi lo mismo.`
        : `Está en ${meal.label.toLowerCase()} y lo evitas: quítalo o elige otro alimento.`,
      ...(alternative ? { swap: { slot: meal.slot, index, item: alternative } } : {}),
    });
  }

  // 2. Antes y después de entrenar.
  if (trainTime !== null) {
    if (pre && !doneSlots.includes(pre.slot)) {
      const fattiest = pre.items
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => !touched.has(key(pre.slot, index)))
        .sort((a, b) => b.item.fatsG - a.item.fatsG)[0];
      if (pre.totals.fatsG > 20 && fattiest && fattiest.item.fatsG >= 8) {
        const alternative = equivalents(fattiest.item, {
          ...options,
          role: "carbs",
          avoid: ["fried", "satFat"],
        })[0];
        if (alternative) {
          touched.add(key(pre.slot, fattiest.index));
          advice.push({
            id: `pre-fat-${pre.slot}`,
            kind: "timing",
            title: `${pre.label} es tu comida antes de entrenar`,
            detail: `Tiene ${Math.round(pre.totals.fatsG)} g de grasa, que se digiere lento. Cambia ${fattiest.item.name} por ${alternative.name} (${alternative.grams} g) para entrenar más ligero.`,
            swap: { slot: pre.slot, index: fattiest.index, item: alternative },
          });
        }
      } else if (pre.totals.carbsG < 30) {
        advice.push({
          id: `pre-carbs-${pre.slot}`,
          kind: "timing",
          title: `${pre.label} es tu comida antes de entrenar`,
          detail: `Solo tiene ${Math.round(pre.totals.carbsG)} g de carbohidratos. Si puedes, suma una fruta o pan: rinde más con algo de carbohidrato 1–3 h antes.`,
        });
      }
    }
    if (!pre && pending.length) {
      const before = [...pending].reverse().find((meal) => meal.minutes < trainTime) ?? null;
      const after = pending.find((meal) => meal.minutes >= trainTime) ?? null;
      const move = before ?? after;
      if (move && trainTime - 90 > now)
        advice.push({
          id: "pre-move",
          kind: "timing",
          title: "Sin comida cerca del entreno",
          detail: `Entrenas a las ${formatTime(trainTime)} y no tienes nada en las 4 h previas. Mueve ${move.label.toLowerCase()} hacia las ${formatTime(trainTime - 90)}.`,
        });
    }
  }
  if (post && post.totals.proteinG < 20) {
    const protein = post.items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => roleOf(item) === "protein" && !touched.has(key(post.slot, index)))
      .sort((a, b) => b.item.proteinG - a.item.proteinG)[0];
    if (protein && protein.item.proteinG > 0) {
      const factor = Math.min(
        2,
        (protein.item.proteinG + (25 - post.totals.proteinG)) / protein.item.proteinG,
      );
      const bigger = scaleItem(protein.item, factor);
      touched.add(key(post.slot, protein.index));
      advice.push({
        id: `post-protein-${post.slot}`,
        kind: "timing",
        title: `${post.label} es tu comida después de entrenar`,
        detail: `Tiene ${Math.round(post.totals.proteinG)} g de proteína; después de entrenar conviene llegar a 20–40 g. Sube ${protein.item.name} a ${bigger.grams} g.`,
        swap: { slot: post.slot, index: protein.index, item: bigger },
      });
    } else {
      advice.push({
        id: `post-protein-${post.slot}`,
        kind: "timing",
        title: `${post.label} es tu comida después de entrenar`,
        detail: `Solo tiene ${Math.round(post.totals.proteinG)} g de proteína. Suma huevo, pollo, pescado, lácteos o menestras hasta 20–40 g.`,
      });
    }
  }

  // 3. Cómo te sientes hoy.
  if (feeling.energy !== null && feeling.energy !== undefined && feeling.energy <= 2 && nextMeal) {
    const carb = nextMeal.items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => roleOf(item) === "carbs" && !touched.has(key(nextMeal.slot, index)))
      .sort((a, b) => b.item.carbsG - a.item.carbsG)[0];
    if (carb) {
      const bigger = scaleItem(carb.item, 1.25);
      touched.add(key(nextMeal.slot, carb.index));
      advice.push({
        id: "energy-carbs",
        kind: "feeling",
        title: "Energía baja",
        detail: `No saltes ${nextMeal.label.toLowerCase()}. Puedes subir ${carb.item.name} a ${bigger.grams} g ahora y compensarlo en la última comida.`,
        swap: { slot: nextMeal.slot, index: carb.index, item: bigger },
      });
    } else
      advice.push({
        id: "energy-meal",
        kind: "feeling",
        title: "Energía baja",
        detail: `No saltes ${nextMeal.label.toLowerCase()} y toma agua: la energía baja muchas veces es comer tarde o poca hidratación.`,
      });
  }
  if (feeling.sleepMinutes !== null && feeling.sleepMinutes !== undefined && feeling.sleepMinutes < 360) {
    const caffeine = pendingItems.find(
      ({ meal, item }) =>
        meal.minutes >= 14 * 60 && tagsOf({ name: item.name, per100: item }).traits.includes("caffeine"),
    );
    advice.push({
      id: "sleep",
      kind: "feeling",
      title: "Dormiste poco",
      detail: caffeine
        ? `Hoy puede haber más hambre: prioriza la proteína de cada comida. Evita ${caffeine.item.name} de ${caffeine.meal.label.toLowerCase()}: la cafeína de la tarde alarga el problema.`
        : "Hoy puede haber más hambre: no recortes, prioriza la proteína de cada comida y evita la cafeína desde las 14:00.",
    });
  }
  if (feeling.stress !== null && feeling.stress !== undefined && feeling.stress >= 4)
    advice.push({
      id: "stress",
      kind: "feeling",
      title: "Día de estrés",
      detail:
        "Mantén tus comidas a su hora y sin recortes: con estrés alto, saltarse comidas suele terminar en comer de más por la noche.",
    });

  // 4. Salud: lo que conviene limitar y lo que conviene incluir.
  const conditions = health.conditions.map(conditionById);
  if (conditions.length) {
    const limited = pendingItems
      .filter(({ meal, index }) => !touched.has(key(meal.slot, index)))
      .map((entry) => ({ ...entry, fit: fitOfItem(entry.item, health) }))
      .filter((entry) => entry.fit.limited.length)
      .sort((a, b) => a.fit.score - b.fit.score)
      .slice(0, 2);
    for (const { meal, item, index, fit } of limited) {
      const alternative = equivalents(item, { ...options, avoid: fit.limited })[0];
      if (!alternative) continue;
      touched.add(key(meal.slot, index));
      advice.push({
        id: `health-limit-${key(meal.slot, index)}`,
        kind: "health",
        title: `${item.name}: conviene limitarlo`,
        detail: `Por ${list(fit.limited)}. En ${meal.label.toLowerCase()} puedes usar ${alternative.name} (${alternative.grams} g).`,
        swap: { slot: meal.slot, index, item: alternative },
      });
    }
    const dayTraits = new Set(
      day.meals.flatMap((meal) =>
        meal.items.flatMap((item) => tagsOf({ name: item.name, per100: item }).traits),
      ),
    );
    for (const condition of conditions) {
      // Lo que más importa de cada condición es su primera característica.
      const main = condition.favor[0];
      if (!main || dayTraits.has(main)) continue;
      const candidate = pendingItems
        .filter(({ meal, index }) => !touched.has(key(meal.slot, index)))
        .map((entry) => ({ ...entry, alternative: equivalents(entry.item, { ...options, want: [main] })[0] }))
        .find((entry) => entry.alternative);
      if (!candidate?.alternative) continue;
      touched.add(key(candidate.meal.slot, candidate.index));
      advice.push({
        id: `health-favor-${condition.id}`,
        kind: "health",
        title: `Hoy no hay alimentos ricos en ${TRAIT_LABELS[main]}`,
        detail: `Por ${condition.label.toLowerCase()}: en ${candidate.meal.label.toLowerCase()}, cambia ${candidate.item.name} por ${candidate.alternative.name} (${candidate.alternative.grams} g).`,
        swap: { slot: candidate.meal.slot, index: candidate.index, item: candidate.alternative },
      });
    }
  }

  // 5. El resto del día, si lo comido se apartó del plan.
  const consumed = sumNutrients(logged);
  const remaining = sumNutrients(pending.flatMap((meal) => meal.items));
  const planned = sumNutrients(day.meals.flatMap((meal) => meal.items));
  const projected = sumNutrients([consumed, remaining]);
  if (targets.calories > 0 && consumed.kcal > 0 && remaining.kcal > 0) {
    const gap = (projected.kcal - targets.calories) / targets.calories;
    if (Math.abs(gap) > 0.08) {
      // El factor total del día se mueve entre 0.6 y 1.4: más que eso ya no es la misma dieta.
      const current = state.scale ?? 1;
      const wanted = (current * (targets.calories - consumed.kcal)) / remaining.kcal;
      const scale = Math.round(Math.max(0.6, Math.min(1.4, wanted)) * 100) / 100;
      if (Math.abs(scale - current) >= 0.05)
        advice.push({
          id: "balance",
          kind: "balance",
          title: gap > 0 ? "Vas por encima de tu objetivo" : "Vas por debajo de tu objetivo",
          detail: `Con lo que falta terminarías en ${projected.kcal} kcal (objetivo ${targets.calories}). ${
            gap > 0 ? "Reduce" : "Sube"
          } las porciones que quedan un ${Math.round(Math.abs(scale / current - 1) * 100)} % para cerrar cerca.`,
          scale,
        });
    }
  }

  return {
    meals,
    next: meals.find((meal) => meal.status === "next") ?? null,
    askTraining:
      input.trainingDay &&
      !trained &&
      !state.noTraining &&
      (state.trainTime === undefined || state.trainTime === null),
    advice: advice.slice(0, 6),
    planned,
    consumed,
    projected,
  };
}

/** Aplica una recomendación al estado del día. */
export function applyAdvice(state: DayState, advice: Advice): DayState {
  if (advice.scale) return { ...state, scale: advice.scale };
  if (!advice.swap) return state;
  const { slot, index, item } = advice.swap;
  return {
    ...state,
    swaps: [
      ...state.swaps.filter((entry) => !(entry.slot === slot && entry.index === index)),
      { slot, index, item },
    ],
  };
}
