/**
 * Catálogo de ejercicios, escrito para Dophamine (sin datos ni imágenes de
 * terceros). Cada ejercicio dice qué músculos trabaja, con qué equipo y qué
 * patrón de movimiento sigue: con eso se sugieren reemplazos y se cuentan las
 * series por músculo de la semana.
 */
export type Muscle =
  | "chest"
  | "lats"
  | "upperBack"
  | "frontDelts"
  | "sideDelts"
  | "rearDelts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "lowerBack"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "adductors"
  | "calves";
export type Equipment =
  "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "band" | "kettlebell" | "smith";
export type Pattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "horizontalPush"
  | "verticalPush"
  | "horizontalPull"
  | "verticalPull"
  | "elbowFlexion"
  | "elbowExtension"
  | "shoulderRaise"
  | "chestFly"
  | "kneeFlexion"
  | "kneeExtension"
  | "hipThrust"
  | "hipAbduction"
  | "hipAdduction"
  | "calfRaise"
  | "core"
  | "carry";

export type CatalogExercise = {
  id: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment;
  pattern: Pattern;
  /** Se trabaja un lado a la vez: conviene registrar izquierda y derecha. */
  unilateral?: boolean;
  /** Otros nombres con los que aparece en rutinas. */
  aliases?: string[];
};

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: "Pecho",
  lats: "Dorsales",
  upperBack: "Espalda alta",
  frontDelts: "Hombro frontal",
  sideDelts: "Hombro lateral",
  rearDelts: "Hombro posterior",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebrazos",
  abs: "Abdomen",
  obliques: "Oblicuos",
  lowerBack: "Zona lumbar",
  glutes: "Glúteos",
  quads: "Cuádriceps",
  hamstrings: "Isquiotibiales",
  adductors: "Aductores",
  calves: "Pantorrillas",
};
export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barra",
  dumbbell: "Mancuernas",
  machine: "Máquina",
  cable: "Polea",
  bodyweight: "Peso corporal",
  band: "Banda",
  kettlebell: "Kettlebell",
  smith: "Multipower",
};

type Row = [string, Muscle[], Muscle[], Equipment, Pattern, { unilateral?: boolean; aliases?: string[] }?];

const ROWS: Row[] = [
  // Piernas: sentadilla y prensa
  [
    "Sentadilla con barra",
    ["quads", "glutes"],
    ["adductors", "lowerBack"],
    "barbell",
    "squat",
    { aliases: ["Sentadilla", "Back squat"] },
  ],
  ["Sentadilla frontal", ["quads"], ["glutes", "abs"], "barbell", "squat"],
  ["Sentadilla goblet", ["quads", "glutes"], ["adductors", "abs"], "dumbbell", "squat"],
  ["Sentadilla con mancuernas", ["quads", "glutes"], ["adductors"], "dumbbell", "squat"],
  ["Sentadilla en multipower", ["quads", "glutes"], ["adductors"], "smith", "squat"],
  ["Sentadilla hack", ["quads"], ["glutes"], "machine", "squat"],
  ["Sentadilla búlgara", ["quads", "glutes"], ["adductors"], "dumbbell", "lunge", { unilateral: true }],
  ["Prensa", ["quads", "glutes"], ["adductors"], "machine", "squat", { aliases: ["Prensa de piernas"] }],
  ["Sentadilla con peso corporal", ["quads", "glutes"], [], "bodyweight", "squat"],
  [
    "Zancadas",
    ["quads", "glutes"],
    ["adductors"],
    "dumbbell",
    "lunge",
    { unilateral: true, aliases: ["Zancadas con mancuernas"] },
  ],
  ["Zancadas caminando", ["quads", "glutes"], ["adductors"], "dumbbell", "lunge", { unilateral: true }],
  ["Subida al cajón", ["quads", "glutes"], [], "dumbbell", "lunge", { unilateral: true }],
  ["Extensión de cuádriceps", ["quads"], [], "machine", "kneeExtension"],
  // Cadena posterior
  [
    "Peso muerto convencional",
    ["glutes", "hamstrings", "lowerBack"],
    ["upperBack", "forearms", "quads"],
    "barbell",
    "hinge",
    { aliases: ["Peso muerto"] },
  ],
  ["Peso muerto sumo", ["glutes", "adductors"], ["hamstrings", "quads", "lowerBack"], "barbell", "hinge"],
  ["Peso muerto rumano", ["hamstrings", "glutes"], ["lowerBack", "forearms"], "barbell", "hinge"],
  [
    "Peso muerto con mancuernas",
    ["hamstrings", "glutes"],
    ["lowerBack"],
    "dumbbell",
    "hinge",
    { aliases: ["Peso muerto rumano con mancuernas"] },
  ],
  [
    "Peso muerto a una pierna",
    ["hamstrings", "glutes"],
    ["lowerBack"],
    "dumbbell",
    "hinge",
    { unilateral: true },
  ],
  [
    "Buenos días",
    ["hamstrings", "lowerBack"],
    ["glutes"],
    "barbell",
    "hinge",
    { aliases: ["Buenos días con banda"] },
  ],
  ["Hip thrust", ["glutes"], ["hamstrings"], "barbell", "hipThrust", { aliases: ["Hip thrust con barra"] }],
  ["Hip thrust en máquina", ["glutes"], ["hamstrings"], "machine", "hipThrust"],
  ["Puente de glúteos", ["glutes"], ["hamstrings"], "bodyweight", "hipThrust"],
  [
    "Curl femoral acostado",
    ["hamstrings"],
    ["calves"],
    "machine",
    "kneeFlexion",
    { aliases: ["Curl femoral"] },
  ],
  ["Curl femoral sentado", ["hamstrings"], [], "machine", "kneeFlexion"],
  ["Curl femoral deslizante", ["hamstrings"], ["glutes"], "bodyweight", "kneeFlexion"],
  ["Curl nórdico", ["hamstrings"], [], "bodyweight", "kneeFlexion"],
  [
    "Extensión lumbar",
    ["lowerBack", "glutes"],
    ["hamstrings"],
    "bodyweight",
    "hinge",
    { aliases: ["Hiperextensiones"] },
  ],
  ["Abducción de cadera en máquina", ["glutes"], [], "machine", "hipAbduction"],
  ["Patada de glúteo en polea", ["glutes"], ["hamstrings"], "cable", "hipThrust", { unilateral: true }],
  ["Aducción de cadera en máquina", ["adductors"], [], "machine", "hipAdduction"],
  [
    "Elevación de talones de pie",
    ["calves"],
    [],
    "machine",
    "calfRaise",
    { aliases: ["Pantorrillas de pie"] },
  ],
  ["Elevación de talones sentado", ["calves"], [], "machine", "calfRaise"],
  ["Elevación de talones en prensa", ["calves"], [], "machine", "calfRaise"],
  ["Swing con kettlebell", ["glutes", "hamstrings"], ["lowerBack", "abs"], "kettlebell", "hinge"],
  // Empuje horizontal
  [
    "Press de banca",
    ["chest"],
    ["frontDelts", "triceps"],
    "barbell",
    "horizontalPush",
    { aliases: ["Press de pecho", "Press banca"] },
  ],
  [
    "Press de banca inclinado",
    ["chest", "frontDelts"],
    ["triceps"],
    "barbell",
    "horizontalPush",
    { aliases: ["Press inclinado con barra"] },
  ],
  [
    "Press con mancuernas",
    ["chest"],
    ["frontDelts", "triceps"],
    "dumbbell",
    "horizontalPush",
    { aliases: ["Press de banca con mancuernas", "Press de pecho con mancuernas"] },
  ],
  ["Press inclinado con mancuernas", ["chest", "frontDelts"], ["triceps"], "dumbbell", "horizontalPush"],
  ["Press de pecho en máquina", ["chest"], ["frontDelts", "triceps"], "machine", "horizontalPush"],
  ["Press en multipower", ["chest"], ["frontDelts", "triceps"], "smith", "horizontalPush"],
  [
    "Flexiones",
    ["chest"],
    ["frontDelts", "triceps", "abs"],
    "bodyweight",
    "horizontalPush",
    { aliases: ["Lagartijas"] },
  ],
  [
    "Fondos en paralelas",
    ["chest", "triceps"],
    ["frontDelts"],
    "bodyweight",
    "horizontalPush",
    { aliases: ["Fondos"] },
  ],
  ["Aperturas con mancuernas", ["chest"], ["frontDelts"], "dumbbell", "chestFly"],
  ["Aperturas en polea", ["chest"], ["frontDelts"], "cable", "chestFly", { aliases: ["Cruce de poleas"] }],
  ["Pec deck", ["chest"], [], "machine", "chestFly", { aliases: ["Aperturas en máquina"] }],
  // Empuje vertical y hombros
  [
    "Press militar",
    ["frontDelts"],
    ["sideDelts", "triceps"],
    "barbell",
    "verticalPush",
    { aliases: ["Press militar con barra", "Press de hombros con barra"] },
  ],
  [
    "Press de hombros con mancuernas",
    ["frontDelts"],
    ["sideDelts", "triceps"],
    "dumbbell",
    "verticalPush",
    { aliases: ["Press militar con mancuernas"] },
  ],
  ["Press de hombros en máquina", ["frontDelts"], ["sideDelts", "triceps"], "machine", "verticalPush"],
  ["Press Arnold", ["frontDelts", "sideDelts"], ["triceps"], "dumbbell", "verticalPush"],
  ["Flexiones en pica", ["frontDelts"], ["triceps"], "bodyweight", "verticalPush"],
  [
    "Elevaciones laterales",
    ["sideDelts"],
    [],
    "dumbbell",
    "shoulderRaise",
    { aliases: ["Elevaciones laterales con mancuernas"] },
  ],
  ["Elevaciones laterales en polea", ["sideDelts"], [], "cable", "shoulderRaise", { unilateral: true }],
  ["Elevaciones laterales en máquina", ["sideDelts"], [], "machine", "shoulderRaise"],
  ["Elevaciones frontales", ["frontDelts"], [], "dumbbell", "shoulderRaise"],
  [
    "Pájaros con mancuernas",
    ["rearDelts"],
    ["upperBack"],
    "dumbbell",
    "shoulderRaise",
    { aliases: ["Vuelos posteriores"] },
  ],
  ["Face pull", ["rearDelts", "upperBack"], [], "cable", "horizontalPull"],
  [
    "Reverse pec deck",
    ["rearDelts"],
    ["upperBack"],
    "machine",
    "shoulderRaise",
    { aliases: ["Pec deck invertido"] },
  ],
  [
    "Encogimientos de hombros",
    ["upperBack"],
    ["forearms"],
    "dumbbell",
    "shoulderRaise",
    { aliases: ["Encogimientos"] },
  ],
  // Tirón
  ["Dominadas", ["lats"], ["biceps", "upperBack"], "bodyweight", "verticalPull", { aliases: ["Pull ups"] }],
  [
    "Dominadas supinas",
    ["lats", "biceps"],
    ["upperBack"],
    "bodyweight",
    "verticalPull",
    { aliases: ["Chin ups"] },
  ],
  ["Dominadas asistidas", ["lats"], ["biceps", "upperBack"], "machine", "verticalPull"],
  [
    "Jalón al pecho",
    ["lats"],
    ["biceps", "upperBack"],
    "cable",
    "verticalPull",
    { aliases: ["Jalón al pecho en polea", "Polea al pecho"] },
  ],
  ["Jalón con agarre neutro", ["lats"], ["biceps", "upperBack"], "cable", "verticalPull"],
  ["Pullover en polea", ["lats"], ["triceps"], "cable", "verticalPull"],
  [
    "Remo con barra",
    ["upperBack", "lats"],
    ["biceps", "rearDelts", "lowerBack"],
    "barbell",
    "horizontalPull",
    { aliases: ["Remo inclinado con barra"] },
  ],
  [
    "Remo con mancuerna",
    ["lats", "upperBack"],
    ["biceps", "rearDelts"],
    "dumbbell",
    "horizontalPull",
    { unilateral: true, aliases: ["Remo con mancuernas", "Remo a una mano"] },
  ],
  [
    "Remo en máquina",
    ["upperBack", "lats"],
    ["biceps", "rearDelts"],
    "machine",
    "horizontalPull",
    { aliases: ["Remo en banda"] },
  ],
  [
    "Remo sentado en polea",
    ["upperBack", "lats"],
    ["biceps", "rearDelts"],
    "cable",
    "horizontalPull",
    { aliases: ["Remo en polea baja"] },
  ],
  ["Remo con pecho apoyado", ["upperBack", "lats"], ["rearDelts", "biceps"], "dumbbell", "horizontalPull"],
  ["Remo invertido", ["upperBack", "lats"], ["biceps"], "bodyweight", "horizontalPull"],
  ["Remo T", ["upperBack", "lats"], ["biceps", "lowerBack"], "barbell", "horizontalPull"],
  // Brazos
  [
    "Curl de bíceps con barra",
    ["biceps"],
    ["forearms"],
    "barbell",
    "elbowFlexion",
    { aliases: ["Curl con barra"] },
  ],
  [
    "Curl de bíceps",
    ["biceps"],
    ["forearms"],
    "dumbbell",
    "elbowFlexion",
    { aliases: ["Curl con mancuernas", "Curl de bíceps con mancuernas"] },
  ],
  ["Curl martillo", ["biceps", "forearms"], [], "dumbbell", "elbowFlexion"],
  ["Curl inclinado", ["biceps"], [], "dumbbell", "elbowFlexion"],
  ["Curl predicador", ["biceps"], [], "machine", "elbowFlexion", { aliases: ["Curl Scott"] }],
  ["Curl en polea", ["biceps"], ["forearms"], "cable", "elbowFlexion"],
  ["Curl con banda", ["biceps"], [], "band", "elbowFlexion"],
  [
    "Extensión de tríceps en polea",
    ["triceps"],
    [],
    "cable",
    "elbowExtension",
    { aliases: ["Pushdown", "Jalón de tríceps"] },
  ],
  [
    "Extensión de tríceps sobre la cabeza",
    ["triceps"],
    [],
    "cable",
    "elbowExtension",
    { aliases: ["Extensión francesa en polea"] },
  ],
  ["Press francés", ["triceps"], [], "barbell", "elbowExtension", { aliases: ["Rompecráneos"] }],
  ["Extensión de tríceps con mancuerna", ["triceps"], [], "dumbbell", "elbowExtension"],
  ["Press de banca agarre cerrado", ["triceps", "chest"], ["frontDelts"], "barbell", "horizontalPush"],
  ["Fondos en banco", ["triceps"], ["chest", "frontDelts"], "bodyweight", "elbowExtension"],
  ["Curl de muñeca", ["forearms"], [], "dumbbell", "elbowFlexion"],
  // Core y otros
  ["Plancha", ["abs"], ["obliques"], "bodyweight", "core"],
  ["Plancha lateral", ["obliques"], ["abs"], "bodyweight", "core", { unilateral: true }],
  ["Crunch", ["abs"], [], "bodyweight", "core", { aliases: ["Abdominales"] }],
  ["Crunch en polea", ["abs"], [], "cable", "core"],
  ["Elevación de piernas colgado", ["abs"], ["obliques", "forearms"], "bodyweight", "core"],
  ["Rueda abdominal", ["abs"], ["lats"], "bodyweight", "core"],
  ["Pallof press", ["obliques"], ["abs"], "cable", "core"],
  ["Russian twist", ["obliques"], ["abs"], "bodyweight", "core"],
  ["Paseo del granjero", ["forearms", "upperBack"], ["abs", "glutes"], "dumbbell", "carry"],
];

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const normalizeName = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export const CATALOG: CatalogExercise[] = ROWS.map(
  ([name, primary, secondary, equipment, pattern, extra]) => ({
    id: slug(name),
    name,
    primary,
    secondary,
    equipment,
    pattern,
    ...(extra?.unilateral ? { unilateral: true } : {}),
    ...(extra?.aliases ? { aliases: extra.aliases } : {}),
  }),
);

const byName = new Map<string, CatalogExercise>();
for (const exercise of CATALOG)
  for (const name of [exercise.name, ...(exercise.aliases ?? [])]) byName.set(normalizeName(name), exercise);

/** El ejercicio del catálogo con ese nombre o alias, sin importar tildes ni mayúsculas. */
export const findExercise = (name: string): CatalogExercise | null => byName.get(normalizeName(name)) ?? null;

/** Busca por palabras en el nombre, los alias y los músculos. */
export function searchExercises(query: string, catalog: CatalogExercise[] = CATALOG): CatalogExercise[] {
  const words = normalizeName(query).split(" ").filter(Boolean);
  if (!words.length) return catalog;
  return catalog.filter((exercise) => {
    const text = normalizeName(
      [
        exercise.name,
        ...(exercise.aliases ?? []),
        ...exercise.primary.map((muscle) => MUSCLE_LABELS[muscle]),
      ].join(" "),
    );
    return words.every((word) => text.includes(word));
  });
}

/**
 * Reemplazos para un ejercicio: mismo patrón de movimiento y el mismo músculo
 * principal, primero los que usan el equipo pedido. Sirve cuando la máquina
 * está ocupada o se entrena en otro lugar.
 */
export function alternatives(
  exercise: CatalogExercise,
  available?: Equipment[],
  catalog: CatalogExercise[] = CATALOG,
): CatalogExercise[] {
  const candidates = catalog.filter(
    (item) =>
      item.id !== exercise.id &&
      item.pattern === exercise.pattern &&
      item.primary.some((muscle) => exercise.primary.includes(muscle)) &&
      (!available || available.includes(item.equipment)),
  );
  const overlap = (item: CatalogExercise) =>
    item.primary.filter((muscle) => exercise.primary.includes(muscle)).length;
  return candidates.sort((a, b) => overlap(b) - overlap(a) || a.name.localeCompare(b.name));
}
