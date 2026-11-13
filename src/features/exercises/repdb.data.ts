// Versión vacía: el catálogo de RepDB no está en este clon (ver scripts/private-assets.mjs).
import type { Equipment, Muscle, Pattern } from "./catalog.types";

export type RepdbExercise = {
  id: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment;
  pattern: Pattern;
  unilateral: boolean;
  /** Se registra en minutos, no en carga y repeticiones. */
  cardio: boolean;
  /** Gasto del ejercicio en MET (1 = en reposo), según RepDB. */
  met: number | null;
  steps: string[];
};

export const OWN_MEDIA: Record<string, string> = {};
export const REPDB_EXERCISES: RepdbExercise[] = [];
