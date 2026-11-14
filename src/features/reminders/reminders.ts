/**
 * Recordatorios de comidas: cuántas comidas hay cada día de la semana, a qué
 * hora, y cuándo avisar (unos minutos antes). Módulo puro; programar las
 * notificaciones es trabajo de `reminders.scheduler` (solo en el teléfono).
 */
import { formatTime, normalizeTime, parseTime } from "@/src/lib/time";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type MealReminder = { id: string; label: string; time: string };
export type ReminderConfig = {
  enabled: boolean;
  /** Minutos de anticipación del aviso. */
  leadMinutes: number;
  days: Record<Weekday, MealReminder[]>;
  /** Aviso diario para pesarse (0.18.0), independiente de las comidas. */
  weighIn?: { enabled: boolean; time: string };
};
export type ScheduledReminder = {
  /** Día de la semana como lo usa el sistema de notificaciones: 1 = domingo … 7 = sábado. */
  weekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

export const WEEKDAYS: Array<{ id: Weekday; short: string; label: string }> = [
  { id: "mon", short: "L", label: "Lunes" },
  { id: "tue", short: "M", label: "Martes" },
  { id: "wed", short: "X", label: "Miércoles" },
  { id: "thu", short: "J", label: "Jueves" },
  { id: "fri", short: "V", label: "Viernes" },
  { id: "sat", short: "S", label: "Sábado" },
  { id: "sun", short: "D", label: "Domingo" },
];
// Lunes es 2 en el sistema de notificaciones (1 es domingo).
const SYSTEM_WEEKDAY: Record<Weekday, number> = { sun: 1, mon: 2, tue: 3, wed: 4, thu: 5, fri: 6, sat: 7 };
const MINUTES_PER_DAY = 24 * 60;

export const MOTIVATION = [
  "Cada comida a tiempo suma a tu meta.",
  "La constancia gana a la perfección.",
  "Tu progreso se construye plato a plato.",
  "Comer bien también es entrenar.",
  "Pequeños hábitos, grandes cambios.",
  "Hoy cuenta. Esta comida también.",
  "Tu cuerpo responde a lo que repites.",
  "Sin prisa, sin pausa.",
  "Registrar es el primer paso para mejorar.",
  "Lo que mides, lo puedes cambiar.",
];

export { formatTime, normalizeTime, parseTime };

const TEMPLATES: Record<number, Array<[string, string]>> = {
  2: [
    ["Almuerzo", "13:00"],
    ["Cena", "20:00"],
  ],
  3: [
    ["Desayuno", "07:30"],
    ["Almuerzo", "13:00"],
    ["Cena", "20:00"],
  ],
  4: [
    ["Desayuno", "07:30"],
    ["Almuerzo", "13:00"],
    ["Merienda", "17:00"],
    ["Cena", "20:30"],
  ],
  5: [
    ["Desayuno", "07:00"],
    ["Media mañana", "10:30"],
    ["Almuerzo", "13:30"],
    ["Merienda", "17:00"],
    ["Cena", "20:30"],
  ],
  6: [
    ["Desayuno", "07:00"],
    ["Media mañana", "10:00"],
    ["Almuerzo", "13:00"],
    ["Merienda", "16:30"],
    ["Cena", "19:30"],
    ["Antes de dormir", "22:00"],
  ],
};
export const TEMPLATE_SIZES = Object.keys(TEMPLATES).map(Number);

export function templateMeals(count: number, newId: () => string): MealReminder[] {
  return (TEMPLATES[count] ?? TEMPLATES[3]).map(([label, time]) => ({ id: newId(), label, time }));
}

export function defaultConfig(newId: () => string): ReminderConfig {
  const days = Object.fromEntries(WEEKDAYS.map((day) => [day.id, templateMeals(3, newId)])) as Record<
    Weekday,
    MealReminder[]
  >;
  return { enabled: false, leadMinutes: 5, days };
}

export const sortMeals = (meals: MealReminder[]) =>
  [...meals].sort((a, b) => (parseTime(a.time) ?? 0) - (parseTime(b.time) ?? 0));

/** Copia las comidas de un día a todos los demás, con ids nuevos. */
export function copyToAllDays(config: ReminderConfig, from: Weekday, newId: () => string): ReminderConfig {
  const source = config.days[from];
  const days = Object.fromEntries(
    WEEKDAYS.map((day) => [
      day.id,
      day.id === from ? source : source.map((meal) => ({ ...meal, id: newId() })),
    ]),
  ) as Record<Weekday, MealReminder[]>;
  return { ...config, days };
}

/** Comidas con hora repetida o sin hora válida. Devuelve el mensaje a mostrar, o null. */
export function dayError(meals: MealReminder[]): string | null {
  if (meals.some((meal) => parseTime(meal.time) === null)) return "Revisa las horas: usa el formato 07:30.";
  if (meals.some((meal) => !meal.label.trim())) return "Cada comida necesita un nombre.";
  const times = meals.map((meal) => parseTime(meal.time));
  if (new Set(times).size !== times.length) return "Dos comidas tienen la misma hora.";
  return null;
}

/** Frase del aviso. Cambia según el día y la comida, siempre la misma para el mismo aviso. */
export const phraseFor = (dayIndex: number, mealIndex: number) =>
  MOTIVATION[(dayIndex * 3 + mealIndex) % MOTIVATION.length];

/**
 * Los avisos a programar: uno por comida y día, `leadMinutes` antes. Si el
 * aviso cae antes de la medianoche (comida a las 00:03), pasa al día anterior.
 */
export function remindersToSchedule(config: ReminderConfig): ScheduledReminder[] {
  const weigh = config.weighIn?.enabled ? parseTime(config.weighIn.time) : null;
  const weighIns: ScheduledReminder[] =
    weigh === null
      ? []
      : WEEKDAYS.map((day) => ({
          weekday: SYSTEM_WEEKDAY[day.id],
          hour: Math.floor(weigh / 60),
          minute: weigh % 60,
          title: "Hora de pesarte",
          body: "Después del baño y antes de comer: así tu tendencia es más fiable.",
        }));
  if (!config.enabled) return weighIns;
  return [...weighIns, ...mealReminders(config)];
}

function mealReminders(config: ReminderConfig): ScheduledReminder[] {
  return WEEKDAYS.flatMap((day, dayIndex) =>
    sortMeals(config.days[day.id]).flatMap((meal, mealIndex) => {
      const minutes = parseTime(meal.time);
      if (minutes === null) return [];
      const at = minutes - config.leadMinutes;
      const shift = at < 0 ? -1 : 0;
      const weekday = ((SYSTEM_WEEKDAY[day.id] - 1 + shift + 7) % 7) + 1;
      const value = ((at % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
      return [
        {
          weekday,
          hour: Math.floor(value / 60),
          minute: value % 60,
          title: `${meal.label} en ${config.leadMinutes} min`,
          body: phraseFor(dayIndex, mealIndex),
        },
      ];
    }),
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Lee una configuración guardada o de un respaldo. Lo que falte o no sirva toma el valor por defecto. */
export function normalizeConfig(value: unknown, newId: () => string): ReminderConfig {
  const fallback = defaultConfig(newId);
  if (!isRecord(value)) return fallback;
  const days = isRecord(value.days) ? value.days : {};
  const lead = Number(value.leadMinutes);
  const weighIn = isRecord(value.weighIn) ? value.weighIn : null;
  const weighTime = weighIn && typeof weighIn.time === "string" ? normalizeTime(weighIn.time) : null;
  return {
    enabled: value.enabled === true,
    ...(weighIn ? { weighIn: { enabled: weighIn.enabled === true, time: weighTime ?? "07:00" } } : {}),
    leadMinutes: Number.isFinite(lead) && lead >= 0 && lead <= 60 ? Math.round(lead) : 5,
    days: Object.fromEntries(
      WEEKDAYS.map((day) => {
        const saved = days[day.id];
        if (!Array.isArray(saved)) return [day.id, fallback.days[day.id]];
        const meals = saved.flatMap((meal) => {
          if (!isRecord(meal) || typeof meal.label !== "string" || typeof meal.time !== "string") return [];
          const time = normalizeTime(meal.time);
          return time
            ? [{ id: typeof meal.id === "string" ? meal.id : newId(), label: meal.label, time }]
            : [];
        });
        return [day.id, sortMeals(meals)];
      }),
    ) as Record<Weekday, MealReminder[]>,
  };
}

/** El día de la semana de una fecha local, como clave. */
export const weekdayOf = (date: Date): Weekday => WEEKDAYS[(date.getDay() + 6) % 7].id;
