import { tagsOf, type Allergen, type Trait } from "@/src/features/health/foodTags";
import type { Food } from "@/src/features/nutrition/foods";

/**
 * Perfil de salud para elegir alimentos: lo que la persona evita (alergias e
 * intolerancias), lo que le indicó su médico o salió en un análisis, y los
 * valores de laboratorio que quiera anotar.
 *
 * No diagnostica ni trata. Un valor se compara con rangos de referencia
 * habituales en adultos solo para sugerir qué marcar; cada laboratorio tiene
 * los suyos y decide el médico. Las recomendaciones son pautas generales de
 * alimentación para cada situación. Se guarda en ajustes (`health_profile`).
 * Módulo puro.
 */
export const HEALTH_KEY = "health_profile";

export type ConditionId =
  | "lowIron"
  | "lowB12"
  | "lowFolate"
  | "lowVitD"
  | "highCholesterol"
  | "highTriglycerides"
  | "highGlucose"
  | "highUricAcid"
  | "highBloodPressure"
  | "gastritis"
  | "ibs"
  | "constipation"
  | "fattyLiver"
  | "gallbladder";

export type Condition = {
  id: ConditionId;
  label: string;
  group: "blood" | "digestive";
  /** Conviene incluir alimentos con estas características. */
  favor: Trait[];
  /** Conviene limitar los que tienen estas. */
  limit: Trait[];
  tips: string[];
};

export const CONDITIONS: Condition[] = [
  {
    id: "lowIron",
    label: "Hemoglobina o hierro bajo",
    group: "blood",
    favor: ["iron", "vitC", "b12", "folate"],
    limit: [],
    tips: [
      "Acompaña las fuentes de hierro con vitamina C (limón, naranja, pimiento): se absorbe mejor.",
      "Separa el café y el té al menos una hora de esas comidas.",
    ],
  },
  { id: "lowB12", label: "Vitamina B12 baja", group: "blood", favor: ["b12"], limit: [], tips: [] },
  { id: "lowFolate", label: "Folato bajo", group: "blood", favor: ["folate"], limit: ["alcohol"], tips: [] },
  {
    id: "lowVitD",
    label: "Vitamina D baja",
    group: "blood",
    favor: ["vitD"],
    limit: [],
    tips: ["La comida aporta poca vitamina D: el sol y lo que indique tu médico pesan más."],
  },
  {
    id: "highCholesterol",
    label: "Colesterol LDL alto",
    group: "blood",
    favor: ["fiber", "omega3", "wholeGrain"],
    limit: ["satFat", "fried", "processedMeat"],
    tips: ["Cambia grasas saturadas por aceite de oliva, palta, frutos secos y pescado azul."],
  },
  {
    id: "highTriglycerides",
    label: "Triglicéridos altos",
    group: "blood",
    favor: ["omega3", "fiber"],
    limit: ["sugar", "alcohol", "fried"],
    tips: ["El azúcar, los jugos y el alcohol son lo que más los sube."],
  },
  {
    id: "highGlucose",
    label: "Glucosa alta o prediabetes",
    group: "blood",
    favor: ["fiber", "wholeGrain"],
    limit: ["sugar"],
    tips: ["Acompaña los carbohidratos con proteína y fibra; reparte los carbohidratos en el día."],
  },
  {
    id: "highUricAcid",
    label: "Ácido úrico alto",
    group: "blood",
    favor: [],
    limit: ["purine", "alcohol", "sugar"],
    tips: ["Toma suficiente agua; las vísceras, los mariscos y la cerveza son lo que más lo sube."],
  },
  {
    id: "highBloodPressure",
    label: "Presión alta",
    group: "blood",
    favor: ["potassium", "fiber"],
    limit: ["sodium", "processedMeat", "alcohol"],
    tips: ["Cocina con menos sal y evita embutidos y enlatados salados."],
  },
  {
    id: "gastritis",
    label: "Gastritis o reflujo",
    group: "digestive",
    favor: [],
    limit: ["acidic", "fried", "caffeine", "alcohol"],
    tips: ["Come porciones más pequeñas y espera 2–3 horas antes de acostarte."],
  },
  {
    id: "ibs",
    label: "Colon irritable",
    group: "digestive",
    favor: [],
    limit: ["fodmap", "caffeine", "fried", "alcohol"],
    tips: [
      "Una dieta baja en FODMAP se hace por fases y con un profesional: aquí solo se evitan los más comunes.",
    ],
  },
  {
    id: "constipation",
    label: "Estreñimiento",
    group: "digestive",
    favor: ["fiber"],
    limit: [],
    tips: ["Sube la fibra de a poco y con suficiente agua."],
  },
  {
    id: "fattyLiver",
    label: "Hígado graso",
    group: "digestive",
    favor: ["fiber", "omega3"],
    limit: ["sugar", "alcohol", "satFat", "fried"],
    tips: [],
  },
  {
    id: "gallbladder",
    label: "Vesícula (cálculos o sin vesícula)",
    group: "digestive",
    favor: [],
    limit: ["fried", "satFat"],
    tips: ["Reparte las grasas en el día en lugar de juntarlas en una comida."],
  },
];

export const conditionById = (id: ConditionId) => CONDITIONS.find((item) => item.id === id) as Condition;

export type LabId =
  | "hemoglobin"
  | "ferritin"
  | "b12"
  | "folate"
  | "vitD"
  | "ldl"
  | "triglycerides"
  | "glucose"
  | "hba1c"
  | "uricAcid";

export type LabTest = {
  id: LabId;
  label: string;
  unit: string;
  /** Por debajo de esto se considera bajo (según el sexo, si cambia). */
  low?: { male: number; female: number };
  /** Desde esto se considera alto. */
  high?: { male: number; female: number };
  condition: ConditionId;
};

const both = (value: number) => ({ male: value, female: value });

/** Rangos de referencia habituales en adultos. Cada laboratorio puede usar otros. */
export const LAB_TESTS: LabTest[] = [
  {
    id: "hemoglobin",
    label: "Hemoglobina",
    unit: "g/dL",
    low: { male: 13, female: 12 },
    condition: "lowIron",
  },
  { id: "ferritin", label: "Ferritina", unit: "ng/mL", low: { male: 30, female: 15 }, condition: "lowIron" },
  { id: "b12", label: "Vitamina B12", unit: "pg/mL", low: both(200), condition: "lowB12" },
  { id: "folate", label: "Folato", unit: "ng/mL", low: both(3), condition: "lowFolate" },
  { id: "vitD", label: "Vitamina D (25-OH)", unit: "ng/mL", low: both(20), condition: "lowVitD" },
  { id: "ldl", label: "Colesterol LDL", unit: "mg/dL", high: both(130), condition: "highCholesterol" },
  {
    id: "triglycerides",
    label: "Triglicéridos",
    unit: "mg/dL",
    high: both(150),
    condition: "highTriglycerides",
  },
  { id: "glucose", label: "Glucosa en ayunas", unit: "mg/dL", high: both(100), condition: "highGlucose" },
  { id: "hba1c", label: "Hemoglobina glicosilada", unit: "%", high: both(5.7), condition: "highGlucose" },
  {
    id: "uricAcid",
    label: "Ácido úrico",
    unit: "mg/dL",
    high: { male: 7, female: 6 },
    condition: "highUricAcid",
  },
];

export type LabResult = { id: LabId; value: number; date: string };
export type HealthProfile = { avoid: Allergen[]; conditions: ConditionId[]; labs: LabResult[] };

export const EMPTY_HEALTH: HealthProfile = { avoid: [], conditions: [], labs: [] };

/** Cómo queda un valor frente al rango habitual. */
export function labStatus(test: LabTest, value: number, sex: "female" | "male"): "low" | "high" | "normal" {
  if (test.low && value < test.low[sex]) return "low";
  if (test.high && value >= test.high[sex]) return "high";
  return "normal";
}

/** Condiciones que sugieren los valores anotados (el último de cada examen). No se marcan solas. */
export function suggestedConditions(labs: LabResult[], sex: "female" | "male"): ConditionId[] {
  const latest = new Map<LabId, LabResult>();
  for (const lab of [...labs].sort((a, b) => a.date.localeCompare(b.date))) latest.set(lab.id, lab);
  const found = new Set<ConditionId>();
  for (const lab of latest.values()) {
    const test = LAB_TESTS.find((item) => item.id === lab.id);
    if (test && labStatus(test, lab.value, sex) !== "normal") found.add(test.condition);
  }
  return [...found];
}

const ALLERGENS: Allergen[] = [
  "gluten",
  "dairy",
  "lactose",
  "egg",
  "fish",
  "shellfish",
  "peanut",
  "nuts",
  "soy",
  "sesame",
];

/** Lee el perfil guardado; lo que no reconoce se descarta. */
export function readHealth(value: unknown): HealthProfile {
  if (!value || typeof value !== "object") return EMPTY_HEALTH;
  const raw = value as Partial<HealthProfile>;
  return {
    avoid: (Array.isArray(raw.avoid) ? raw.avoid : []).filter((item) => ALLERGENS.includes(item)),
    conditions: (Array.isArray(raw.conditions) ? raw.conditions : []).filter((item) =>
      CONDITIONS.some((condition) => condition.id === item),
    ),
    labs: (Array.isArray(raw.labs) ? raw.labs : []).filter(
      (lab) =>
        Boolean(lab) &&
        LAB_TESTS.some((test) => test.id === lab.id) &&
        typeof lab.value === "number" &&
        lab.value > 0 &&
        typeof lab.date === "string",
    ),
  };
}

export type FoodFit = {
  /** Alérgenos o intolerancias que la persona evita y este alimento tiene. */
  blocked: Allergen[];
  /** Características que conviene limitar según sus condiciones. */
  limited: Trait[];
  /** Características que conviene incluir. */
  favored: Trait[];
  /** Positivo si ayuda, negativo si conviene limitarlo. */
  score: number;
};

/** Cómo encaja un alimento con el perfil de salud. */
export function foodFit(food: Pick<Food, "name" | "per100">, health: HealthProfile): FoodFit {
  const tags = tagsOf(food);
  // Quien evita lácteos evita también la lactosa; quien evita lactosa puede tomar lácteos sin ella.
  const blocked = health.avoid.filter((allergen) => tags.allergens.includes(allergen));
  const conditions = health.conditions.map(conditionById);
  const limit = new Set(conditions.flatMap((condition) => condition.limit));
  const favor = new Set(conditions.flatMap((condition) => condition.favor));
  const limited = tags.traits.filter((trait) => limit.has(trait));
  const favored = tags.traits.filter((trait) => favor.has(trait) && !limit.has(trait));
  return { blocked, limited, favored, score: favored.length - limited.length * 1.5 };
}
