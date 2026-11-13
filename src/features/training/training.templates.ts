import type { MuscleGroup } from "@/src/features/exercises/catalog";
import type { Experience } from "@/src/features/profile/profile";

/**
 * Plantillas de semana de entreno. Cada una dice qué días entrena, qué se hace
 * cada día (con su enfoque muscular) y para quién se recomienda. Los nombres
 * de ejercicio son del catálogo. Son un punto de partida: todo se edita.
 */
export type TemplateId = "full_body" | "upper_lower" | "push_pull_legs" | "ppl6" | "hybrid" | "posterior";

export type TemplateSession = { name: string; focus: MuscleGroup[]; gym: string[]; home: string[] };
export type Template = {
  id: TemplateId;
  label: string;
  detail: string;
  days: string[];
  sessions: TemplateSession[];
  levels: Experience[];
};

const PUSH_A: TemplateSession = {
  name: "Empuje",
  focus: ["chest", "shoulders", "triceps"],
  gym: [
    "Press de banca",
    "Press militar",
    "Press inclinado con mancuernas",
    "Elevaciones laterales",
    "Extensión de tríceps en polea",
    "Fondos en paralelas",
  ],
  home: [
    "Flexiones",
    "Press de hombros con mancuernas",
    "Flexiones en pica",
    "Elevaciones laterales",
    "Extensión de tríceps con mancuerna",
    "Fondos en banco",
  ],
};
const PULL_A: TemplateSession = {
  name: "Tirón",
  focus: ["back", "biceps", "forearms"],
  gym: [
    "Dominadas",
    "Remo con barra",
    "Remo sentado en polea",
    "Face pull",
    "Curl de bíceps con barra",
    "Curl martillo",
  ],
  home: [
    "Remo invertido",
    "Remo con mancuerna",
    "Pájaros con mancuernas",
    "Encogimientos de hombros",
    "Curl de bíceps",
    "Curl martillo",
  ],
};
const LEGS_A: TemplateSession = {
  name: "Pierna",
  focus: ["legs", "glutes", "core"],
  gym: [
    "Sentadilla con barra",
    "Peso muerto rumano",
    "Prensa",
    "Curl femoral sentado",
    "Elevación de talones de pie",
    "Plancha",
  ],
  home: [
    "Sentadilla goblet",
    "Peso muerto con mancuernas",
    "Zancadas",
    "Curl femoral deslizante",
    "Puente de glúteos",
    "Plancha",
  ],
};
const PUSH_B: TemplateSession = {
  name: "Empuje B",
  focus: ["chest", "shoulders", "triceps"],
  gym: [
    "Press de banca inclinado",
    "Press de hombros con mancuernas",
    "Aperturas en polea",
    "Elevaciones laterales en polea",
    "Press francés",
    "Extensión de tríceps sobre la cabeza",
  ],
  home: [
    "Flexiones",
    "Press Arnold",
    "Aperturas con mancuernas",
    "Elevaciones laterales",
    "Extensión de tríceps con mancuerna",
    "Fondos en banco",
  ],
};
const PULL_B: TemplateSession = {
  name: "Tirón B",
  focus: ["back", "biceps", "forearms"],
  gym: [
    "Jalón al pecho",
    "Remo con pecho apoyado",
    "Remo con mancuerna",
    "Reverse pec deck",
    "Curl inclinado",
    "Curl en polea",
  ],
  home: [
    "Remo invertido",
    "Remo con mancuerna",
    "Pájaros con mancuernas",
    "Encogimientos de hombros",
    "Curl inclinado",
    "Curl martillo",
  ],
};
const LEGS_B: TemplateSession = {
  name: "Pierna B",
  focus: ["legs", "glutes", "core"],
  gym: [
    "Peso muerto convencional",
    "Sentadilla búlgara",
    "Hip thrust",
    "Extensión de cuádriceps",
    "Elevación de talones sentado",
    "Elevación de piernas colgado",
  ],
  home: [
    "Sentadilla búlgara",
    "Puente de glúteos",
    "Peso muerto a una pierna",
    "Zancadas caminando",
    "Crunch",
    "Plancha lateral",
  ],
};
const UPPER: TemplateSession = {
  name: "Torso",
  focus: ["chest", "back", "shoulders", "biceps", "triceps"],
  gym: [
    "Press de banca",
    "Remo con barra",
    "Press de hombros con mancuernas",
    "Jalón al pecho",
    "Curl de bíceps",
    "Extensión de tríceps en polea",
  ],
  home: [
    "Flexiones",
    "Remo con mancuerna",
    "Press de hombros con mancuernas",
    "Remo invertido",
    "Curl de bíceps",
    "Fondos en banco",
  ],
};
const UPPER_B: TemplateSession = {
  ...PUSH_B,
  name: "Torso B",
  focus: ["chest", "back", "shoulders", "biceps", "triceps"],
  gym: [
    "Press inclinado con mancuernas",
    "Remo sentado en polea",
    "Dominadas",
    "Elevaciones laterales",
    "Curl martillo",
    "Press francés",
  ],
  home: [
    "Flexiones en pica",
    "Remo con mancuerna",
    "Remo invertido",
    "Elevaciones laterales",
    "Curl martillo",
    "Extensión de tríceps con mancuerna",
  ],
};

export const TEMPLATES: Template[] = [
  {
    id: "full_body",
    label: "Full body",
    detail: "Todo el cuerpo cada sesión, alternando A y B. Lo mejor para empezar o con poco tiempo.",
    days: ["mon", "wed", "fri"],
    levels: ["beginner"],
    sessions: [
      {
        name: "Full body A",
        focus: ["legs", "chest", "back", "shoulders", "core"],
        gym: [
          "Sentadilla con barra",
          "Press de banca",
          "Remo con barra",
          "Peso muerto rumano",
          "Elevaciones laterales",
          "Plancha",
        ],
        home: [
          "Sentadilla goblet",
          "Flexiones",
          "Remo con mancuerna",
          "Peso muerto con mancuernas",
          "Elevaciones laterales",
          "Plancha",
        ],
      },
      {
        name: "Full body B",
        focus: ["legs", "back", "shoulders", "biceps", "triceps"],
        gym: [
          "Peso muerto convencional",
          "Press militar",
          "Jalón al pecho",
          "Sentadilla búlgara",
          "Curl de bíceps",
          "Extensión de tríceps en polea",
        ],
        home: [
          "Peso muerto a una pierna",
          "Press de hombros con mancuernas",
          "Remo invertido",
          "Sentadilla búlgara",
          "Curl de bíceps",
          "Fondos en banco",
        ],
      },
    ],
  },
  {
    id: "upper_lower",
    label: "Torso / pierna",
    detail: "4 días: torso y pierna dos veces por semana. Equilibrado para quien ya lleva unos meses.",
    days: ["mon", "tue", "thu", "fri"],
    levels: ["beginner", "intermediate", "advanced"],
    sessions: [{ ...UPPER, name: "Torso A" }, { ...LEGS_A, name: "Pierna A" }, UPPER_B, LEGS_B],
  },
  {
    id: "push_pull_legs",
    label: "Empuje / tirón / pierna (3 días)",
    detail: "Cada grupo una vez por semana. Sencilla si solo tienes 3 días.",
    days: ["mon", "wed", "fri"],
    levels: ["intermediate"],
    sessions: [PUSH_A, PULL_A, LEGS_A],
  },
  {
    id: "hybrid",
    label: "Híbrida PPL + torso/pierna (5 días)",
    detail: "Lunes a miércoles empuje, tirón y pierna; jueves descanso; viernes torso y sábado pierna.",
    days: ["mon", "tue", "wed", "fri", "sat"],
    levels: ["intermediate", "advanced"],
    sessions: [PUSH_A, PULL_A, LEGS_A, UPPER, { ...LEGS_B, name: "Pierna (inferior)" }],
  },
  {
    id: "ppl6",
    label: "Empuje / tirón / pierna (6 días)",
    detail: "Lunes y jueves empuje, martes y viernes tirón, miércoles y sábado pierna. Cada grupo dos veces.",
    days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    levels: ["advanced"],
    sessions: [
      { ...PUSH_A, name: "Empuje A" },
      { ...PULL_A, name: "Tirón A" },
      { ...LEGS_A, name: "Pierna A" },
      PUSH_B,
      PULL_B,
      LEGS_B,
    ],
  },
  {
    id: "posterior",
    label: "Glúteo y cadena posterior",
    detail: "3 días con prioridad en glúteos e isquiotibiales.",
    days: ["mon", "wed", "fri"],
    levels: ["beginner", "intermediate"],
    sessions: [
      {
        name: "Cadena posterior",
        focus: ["glutes", "legs", "core"],
        gym: [
          "Hip thrust",
          "Peso muerto rumano",
          "Curl femoral acostado",
          "Extensión lumbar",
          "Patada de glúteo en polea",
          "Plancha",
        ],
        home: [
          "Puente de glúteos",
          "Peso muerto con mancuernas",
          "Curl femoral deslizante",
          "Extensión lumbar",
          "Peso muerto a una pierna",
          "Plancha",
        ],
      },
    ],
  },
];

export const templateById = (id: TemplateId) => TEMPLATES.find((item) => item.id === id) as Template;

/**
 * Plantillas ordenadas para una persona: primero las de su experiencia que
 * caben en los días que puede entrenar, luego el resto.
 */
export function recommendTemplates(
  experience: Experience | undefined,
  daysAvailable: number | undefined,
): Array<Template & { recommended: boolean }> {
  const level = experience ?? "beginner";
  const fits = (template: Template) => !daysAvailable || template.days.length <= daysAvailable;
  const score = (template: Template) => (template.levels.includes(level) ? 2 : 0) + (fits(template) ? 1 : 0);
  return [...TEMPLATES]
    .sort((a, b) => score(b) - score(a))
    .map((template) => ({ ...template, recommended: score(template) === 3 }));
}

export const EXPERIENCE_HINT: Record<Experience, string> = {
  beginner:
    "Si llevas menos de 6 meses, full body 3 días te da más práctica de cada ejercicio y se recupera bien.",
  intermediate:
    "Con 6 meses a 2 años, torso/pierna o una híbrida de 5 días entrenan cada músculo dos veces por semana.",
  advanced: "Con más de 2 años, PPL de 6 días o la híbrida permiten más volumen por músculo.",
};
