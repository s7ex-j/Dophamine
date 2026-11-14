import type { Equipment } from "@/src/features/exercises/catalog";

/**
 * Perfiles de gimnasio (casa, trabajo, comercial, viaje): qué equipo hay, cuánto
 * pesa la barra y el salto mínimo de carga (el par de discos más chico o el
 * paso de las mancuernas). Sirven para filtrar ejercicios, sugerir reemplazos
 * con lo que hay y redondear cargas. Se guardan en ajustes. Módulo puro.
 */
export const GYMS_KEY = "gym_profiles";
export const ACTIVE_GYM_KEY = "active_gym";

export type GymSetup = {
  id: string;
  name: string;
  equipment: Equipment[];
  barKg: number;
  /** Salto mínimo de carga en kg (2.5 = un par de discos de 1.25). */
  incrementKg: number;
};

export const ALL_EQUIPMENT: Equipment[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "smith",
  "kettlebell",
  "band",
  "bodyweight",
  "other",
];

export const DEFAULT_GYMS: GymSetup[] = [
  { id: "comercial", name: "Gimnasio", equipment: ALL_EQUIPMENT, barKg: 20, incrementKg: 2.5 },
  {
    id: "casa",
    name: "Casa",
    equipment: ["dumbbell", "band", "bodyweight", "kettlebell"],
    barKg: 20,
    incrementKg: 2,
  },
  {
    id: "viaje",
    name: "Viaje / hotel",
    equipment: ["bodyweight", "band", "dumbbell"],
    barKg: 20,
    incrementKg: 2,
  },
];

/** Lee los perfiles guardados; sin perfiles válidos, los tres de siempre. */
export function readGyms(value: unknown): GymSetup[] {
  if (!Array.isArray(value)) return DEFAULT_GYMS;
  const gyms = value.filter(
    (item): item is GymSetup =>
      Boolean(item) &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      Array.isArray(item.equipment) &&
      typeof item.barKg === "number" &&
      typeof item.incrementKg === "number" &&
      item.incrementKg > 0,
  );
  return gyms.length ? gyms : DEFAULT_GYMS;
}

export const activeGym = (gyms: GymSetup[], activeId: unknown) =>
  gyms.find((gym) => gym.id === activeId) ?? gyms[0];

/** Redondea una carga al salto que permite el equipo (nunca por debajo de 0). */
export const roundLoad = (kg: number, incrementKg: number) =>
  Math.max(0, Math.round(Math.round(kg / incrementKg) * incrementKg * 100) / 100);

export const hasEquipment = (gym: GymSetup, equipment: Equipment) => gym.equipment.includes(equipment);

/**
 * Series de calentamiento antes de la primera serie efectiva. Con barra empieza
 * con la barra vacía y sube por porcentajes (40, 60 y 80 %); con mancuernas o
 * máquina, dos pasos (50 y 75 %). Cargas redondeadas al equipo y sin repetir.
 */
export function warmupSets(
  workingKg: number,
  equipment: Equipment,
  gym: Pick<GymSetup, "barKg" | "incrementKg">,
): Array<{ loadKg: number; reps: number }> {
  if (!(workingKg > 0)) return [];
  const barbell = equipment === "barbell" || equipment === "smith";
  const steps: Array<[number, number]> = barbell
    ? [
        [0, 10],
        [0.4, 8],
        [0.6, 5],
        [0.8, 3],
      ]
    : [
        [0.5, 10],
        [0.75, 5],
      ];
  const sets: Array<{ loadKg: number; reps: number }> = [];
  for (const [share, reps] of steps) {
    const raw = share === 0 ? gym.barKg : workingKg * share;
    const loadKg = barbell
      ? Math.max(gym.barKg, roundLoad(raw, gym.incrementKg))
      : roundLoad(raw, gym.incrementKg);
    if (loadKg <= 0 || loadKg >= workingKg) continue;
    if (sets.some((set) => set.loadKg === loadKg)) continue;
    sets.push({ loadKg, reps });
  }
  return sets;
}
