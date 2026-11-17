import { normalizeText, type Food } from "@/src/features/nutrition/foods";

/**
 * Etiquetas de un alimento: qué alérgenos lleva y qué lo caracteriza (rico en
 * hierro, en fibra, alto en grasas saturadas, en purinas…). Salen de reglas
 * sobre el nombre, así que también valen para los alimentos propios y los de
 * Open Food Facts. Son orientación general de nutrición, no un análisis del
 * producto: ante una alergia, la etiqueta del envase manda. Módulo puro.
 */
export type Allergen =
  "gluten" | "dairy" | "lactose" | "egg" | "fish" | "shellfish" | "peanut" | "nuts" | "soy" | "sesame";

export type Trait =
  | "iron"
  | "b12"
  | "folate"
  | "vitC"
  | "vitD"
  | "calcium"
  | "fiber"
  | "omega3"
  | "potassium"
  | "magnesium"
  | "wholeGrain"
  | "satFat"
  | "sugar"
  | "sodium"
  | "purine"
  | "fodmap"
  | "caffeine"
  | "acidic"
  | "fried"
  | "alcohol"
  | "processedMeat";

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: "Gluten",
  dairy: "Lácteos",
  lactose: "Lactosa",
  egg: "Huevo",
  fish: "Pescado",
  shellfish: "Mariscos",
  peanut: "Maní",
  nuts: "Frutos secos",
  soy: "Soya",
  sesame: "Ajonjolí",
};

export const TRAIT_LABELS: Record<Trait, string> = {
  iron: "hierro",
  b12: "vitamina B12",
  folate: "folato",
  vitC: "vitamina C",
  vitD: "vitamina D",
  calcium: "calcio",
  fiber: "fibra",
  omega3: "omega-3",
  potassium: "potasio",
  magnesium: "magnesio",
  wholeGrain: "grano entero",
  satFat: "grasas saturadas",
  sugar: "azúcares",
  sodium: "sodio",
  purine: "purinas",
  fodmap: "FODMAP",
  caffeine: "cafeína",
  acidic: "ácidos o irritantes",
  fried: "frituras",
  alcohol: "alcohol",
  processedMeat: "embutidos",
};

// Cada regla: [etiqueta, lo que debe aparecer en el nombre, lo que la descarta].
type Rule<T> = [T, RegExp, RegExp?];

const FISH = /salmon|trucha|bonito|jurel|caballa|tilapia|pescado|merluza|lenguado|atun|sardina|anchoveta/;
const SHELLFISH = /camaron|langostino|pota|calamar|pulpo|concha|choro|marisco|cangrejo/;
const LEGUME = /lenteja|frejol|frijol|garbanzo|pallar|haba|arveja|soya|tarwi|chocho|hummus/;
const PLANT_MILK = /leche de (soya|almendra|coco|avena|arroz)/;

const ALLERGEN_RULES: Rule<Allergen>[] = [
  [
    "gluten",
    /\bpan\b|pasta|fideo|trigo|mote|harina|galleta|tortilla de trigo|avena|granola|barra de cereal|cebada|centeno|cerveza|sillao|salsa de soya|seitan/,
    /cerveza sin gluten|sin gluten/,
  ],
  [
    "dairy",
    /leche|yogur|queso|mantequilla|crema de leche|requeson|ricotta|helado|manjar|dulce de leche|proteina de suero|chocolate de leche/,
    new RegExp(`${PLANT_MILK.source}|mantequilla de mani`),
  ],
  [
    "lactose",
    /leche|yogur|queso fresco|queso crema|requeson|ricotta|cottage|crema de leche|helado|manjar|dulce de leche|proteina de suero|chocolate de leche/,
    new RegExp(`${PLANT_MILK.source}|sin lactosa|deslactosad`),
  ],
  ["egg", /huevo|clara de|yema de|mayonesa/],
  ["fish", FISH],
  ["shellfish", SHELLFISH],
  ["peanut", /\bmani\b|cacahuate/],
  ["nuts", /almendra|nuez|nueces|castana|pecana|pistacho|caju|avellana/, /nuez moscada/],
  ["soy", /soya|soja|tofu|sillao/],
  ["sesame", /ajonjoli|sesamo|hummus|tahini/],
];

const TRAIT_RULES: Rule<Trait>[] = [
  [
    "iron",
    new RegExp(
      `higado|corazon|sangrecita|bazo|\\bres\\b|cordero|${LEGUME.source}|espinaca|quinua|kiwicha|sardina|bonito|ajonjoli|cocoa|chocolate amargo`,
    ),
    /hummus/,
  ],
  [
    "b12",
    new RegExp(
      `higado|corazon|\\bres\\b|cordero|cerdo|pollo|pavo|huevo|yema|leche|yogur|queso|${FISH.source}|${SHELLFISH.source}`,
    ),
    PLANT_MILK,
  ],
  [
    "folate",
    /lenteja|frejol|frijol|garbanzo|espinaca|brocoli|esparrago|palta|betarraga|naranja|higado|alcachofa/,
  ],
  [
    "vitC",
    /naranja|mandarina|kiwi|fresa|papaya|pina|mango|limon|maracuya|aguaymanto|pimiento|brocoli|tomate|camu|guayaba/,
    /salsa de tomate|ketchup/,
  ],
  ["vitD", /salmon|trucha|sardina|caballa|jurel|bonito|atun|yema|huevo/, /clara de/],
  [
    "calcium",
    /leche|yogur|queso|sardina|ajonjoli|almendra|tofu|chia|requeson|cottage/,
    /leche de (coco|arroz)/,
  ],
  [
    "fiber",
    new RegExp(
      `${LEGUME.source}|avena|integral|quinua|kiwicha|chia|linaza|manzana|pera|fresa|arandano|palta|brocoli|alcachofa|zanahoria|camote|cancha|maiz pop|granola|vainita|espinaca|col\\b|datil|pasas`,
    ),
  ],
  ["omega3", /salmon|trucha|sardina|caballa|jurel|bonito|atun|chia|linaza|nuez|nueces/, /nuez moscada/],
  [
    "potassium",
    /platano|palta|\bpapa\b|camote|frejol|frijol|lenteja|espinaca|agua de coco|naranja|tomate|melon|yuca|betarraga|pallar/,
    /papas fritas|platano frito|salsa de tomate|ketchup/,
  ],
  [
    "magnesium",
    /almendra|caju|\bmani\b|girasol|chia|linaza|ajonjoli|espinaca|chocolate amargo|cocoa|frejol|frijol|avena|quinua|palta|castana/,
  ],
  ["wholeGrain", /integral|avena|quinua|kiwicha|maiz pop|trigo o mote|cancha/],
  [
    "satFat",
    /tocino|chicharron|chorizo|salchicha|mantequilla|crema de leche|queso (cheddar|edam|parmesano|crema|mozzarella)|aceite de coco|coco rallado|chocolate de leche|helado|80 20|chuleta|cordero|galletas dulces|leche entera|leche condensada|margarina|manjar/,
    /mantequilla de mani/,
  ],
  [
    "sugar",
    /azucar|miel|mermelada|manjar|dulce de leche|chocolate de leche|helado|gelatina|ketchup|gaseosa|chicha morada|energizante|rehidratante|leche condensada|azucarad|galletas dulces|cereal de maiz|barra de cereal|jugo|granola/,
    /sin azucar|gaseosa sin/,
  ],
  [
    "sodium",
    /jamon|salchicha|chorizo|tocino|sillao|salsa de soya|ketchup|mostaza|aceituna|queso (parmesano|cheddar|edam)|galletas de soda|en aceite|en agua, escurrido|papas fritas|chicharron|cancha/,
  ],
  [
    "purine",
    new RegExp(
      `higado|corazon|sangrecita|bazo|sardina|caballa|jurel|bonito|anchoveta|${SHELLFISH.source}|cerveza`,
    ),
    /cerveza sin alcohol/,
  ],
  [
    "fodmap",
    new RegExp(
      `cebolla|\\bajo\\b|${LEGUME.source}|\\bpan\\b|pasta|fideo|trigo|leche|yogur|queso fresco|helado|manzana|pera|mango|sandia|durazno|datil|miel|coliflor|champinon|esparrago|alcachofa|caju|pistacho`,
    ),
    new RegExp(`${PLANT_MILK.source}|sin lactosa|deslactosad|tofu firme`),
  ],
  ["caffeine", /cafe|\bte\b|energizante|mate|guarana/, /descafeinado|infusion sin|te o infusion/],
  [
    "acidic",
    /cafe|naranja|mandarina|limon|maracuya|pina|tomate|ketchup|\baji\b|chocolate|gaseosa|mostaza|vinagre|energizante/,
  ],
  ["fried", /frit|chicharron|tocino/],
  ["processedMeat", /jamon|salchicha|chorizo|tocino|hot dog|mortadela/],
];

const run = <T>(rules: Rule<T>[], name: string): T[] =>
  rules.flatMap(([tag, match, except]) => (match.test(name) && !(except && except.test(name)) ? [tag] : []));

export type FoodTags = { allergens: Allergen[]; traits: Trait[] };

const cache = new Map<string, FoodTags>();

/** Etiquetas de un alimento por su nombre (y su alcohol, si lo declara). */
export function tagsOf(food: Pick<Food, "name" | "per100">): FoodTags {
  const key = `${food.name}|${food.per100?.alcoholG ?? 0}`;
  const saved = cache.get(key);
  if (saved) return saved;
  const name = normalizeText(food.name);
  const traits = run(TRAIT_RULES, name);
  if (food.per100?.alcoholG || /cerveza|vino|pisco|ron\b|vodka|whisky|destilado/.test(name)) {
    if (!/sin alcohol/.test(name)) traits.push("alcohol");
  }
  const tags = { allergens: run(ALLERGEN_RULES, name), traits };
  cache.set(key, tags);
  return tags;
}

/** Etiquetas a partir de un nombre suelto (un ítem de dieta sin alimento enlazado). */
export const tagsOfName = (name: string) =>
  tagsOf({ name, per100: { kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0 } });
