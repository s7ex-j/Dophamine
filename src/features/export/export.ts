import type { Store } from "@/src/db/web-storage";
import { sleepMinutes } from "@/src/features/sleep/sleep";
import {
  normalizeRoutine,
  syncRoutine,
  type Routine,
  type WorkoutDay,
} from "@/src/features/training/training.plans";
import { localDateKey } from "@/src/lib/dates";

/**
 * Exportar a CSV (para un entrenador o una hoja de cálculo) y compartir
 * programas de entreno en JSON o CSV. Todo sale de los datos ya guardados y
 * solo se envía si la persona comparte el archivo. Módulo puro.
 */

/** Una celda CSV: entre comillas si lleva coma, comillas o salto de línea. */
const cell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Filas → CSV con coma y punto decimal. Empieza con la marca UTF-8 para que
 * Excel muestre bien las tildes.
 */
export const toCsv = (rows: unknown[][]) => `﻿${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;

const yes = (value: boolean | undefined) => (value ? "sí" : "");

/** Un día por fila: peso, composición, lo comido, agua, sueño y si hubo entreno. */
export function dailyCsv(store: Store): string {
  const sleepByDate = new Map(
    (store.sleep ?? []).map((night) => [night.date, sleepMinutes(night.bedtime, night.wakeTime)]),
  );
  const trained = new Set(store.workouts.map((workout) => localDateKey(new Date(workout.completedAt))));
  const dates = [
    ...new Set([...store.biometrics.map((record) => record.date), ...sleepByDate.keys(), ...trained]),
  ].sort();
  const byDate = new Map(store.biometrics.map((record) => [record.date, record]));
  return toCsv([
    [
      "fecha",
      "peso_kg",
      "grasa_pct",
      "musculo_kg",
      "kcal",
      "proteina_g",
      "carbos_g",
      "grasas_g",
      "agua_ml",
      "sueno_min",
      "entreno",
      "dia_incompleto",
      "ayuno",
    ],
    ...dates.map((date) => {
      const record = byDate.get(date);
      return [
        date,
        record?.weightKg ?? "",
        record?.bodyFatPct ?? "",
        record?.muscleMassKg ?? "",
        record?.caloriesIn || "",
        record?.proteinG || "",
        record?.carbsG || "",
        record?.fatsG || "",
        record?.waterMl || "",
        sleepByDate.get(date) ?? "",
        yes(trained.has(date)),
        yes(record?.partial),
        yes(record?.fasting),
      ];
    }),
  ]);
}

/** Cada alimento anotado, con su momento del día y sus nutrientes. */
export function mealsCsv(store: Store): string {
  return toCsv([
    ["fecha", "momento", "alimento", "gramos", "kcal", "proteina_g", "carbos_g", "grasas_g", "alcohol_g"],
    ...[...(store.meals ?? [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => [
        entry.date,
        entry.slot,
        entry.name,
        entry.grams ?? "",
        entry.kcal,
        entry.proteinG,
        entry.carbsG,
        entry.fatsG,
        entry.alcoholG ?? "",
      ]),
  ]);
}

/** Cada serie de cada sesión. */
export function setsCsv(store: Store): string {
  const rows = [...store.workouts]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .flatMap((workout) =>
      (workout.sets ?? []).map((set) => [
        localDateKey(new Date(workout.completedAt)),
        workout.name,
        set.exerciseName,
        set.setNumber,
        set.type,
        set.side ?? "",
        set.loadKg ?? "",
        set.reps ?? "",
        set.rir ?? "",
      ]),
    );
  return toCsv([
    ["fecha", "sesion", "ejercicio", "serie", "tipo", "lado", "carga_kg", "reps", "rir"],
    ...rows,
  ]);
}

// ---- Programas ----

export const PROGRAM_FORMAT = 1;

/** La rutina como archivo para compartir o guardar. */
export const programJson = (routine: Routine) =>
  JSON.stringify(
    {
      app: "dophamine",
      kind: "program",
      format: PROGRAM_FORMAT,
      program: {
        name: routine.name,
        gymProfile: routine.gymProfile,
        trainingGoal: routine.trainingGoal,
        sessionMinutes: routine.sessionMinutes,
        schedule: routine.schedule,
        ...(routine.cycle ? { cycle: routine.cycle } : {}),
      },
    },
    null,
    2,
  );

/** La rutina como CSV: una fila por ejercicio de cada día. */
export const programCsv = (routine: Routine) =>
  toCsv([
    ["dia", "entreno", "ejercicio", "series", "reps", "rir"],
    ...routine.schedule.flatMap((day) =>
      day.exercises.map((exercise) => [
        day.day,
        day.name,
        exercise.name,
        exercise.sets,
        exercise.reps,
        exercise.rir,
      ]),
    ),
  ]);

const DAY_ALIASES: Record<string, string> = {
  mon: "mon",
  lunes: "mon",
  lun: "mon",
  tue: "tue",
  martes: "tue",
  mar: "tue",
  wed: "wed",
  miercoles: "wed",
  mie: "wed",
  thu: "thu",
  jueves: "thu",
  jue: "thu",
  fri: "fri",
  viernes: "fri",
  vie: "fri",
  sat: "sat",
  sabado: "sat",
  sab: "sat",
  sun: "sun",
  domingo: "sun",
  dom: "sun",
};
const plain = (text: string) => text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Lee un CSV simple (coma o punto y coma, con comillas). */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const separator =
    (clean.split("\n")[0].match(/;/g)?.length ?? 0) > (clean.split("\n")[0].match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (quoted) {
      if (char === '"' && clean[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === separator) {
      row.push(value);
      value = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  row.push(value);
  if (row.some((item) => item.trim())) rows.push(row);
  return rows;
}

export type ProgramResult = { routine: Routine; error: null } | { routine: null; error: string };

/**
 * Lee un programa: el JSON que exporta Dophamine o un CSV con columnas
 * dia, entreno, ejercicio, series, reps, rir (los días en español o inglés).
 */
export function parseProgram(text: string): ProgramResult {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as { kind?: string; program?: unknown };
      const program = data.kind === "program" ? data.program : data;
      const routine = normalizeRoutine(program);
      if (!routine.schedule.length || routine.name !== (program as { name?: string })?.name)
        return { routine: null, error: "El archivo no tiene un programa válido." };
      return { routine: { ...routine, variant: "custom" }, error: null };
    } catch {
      return { routine: null, error: "El archivo no es un JSON válido." };
    }
  }
  const rows = parseCsv(trimmed);
  if (rows.length < 2) return { routine: null, error: "El CSV no tiene filas." };
  const header = rows[0].map(plain);
  const column = (name: string) => header.indexOf(name);
  const [dayColumn, nameColumn, exerciseColumn] = [column("dia"), column("entreno"), column("ejercicio")];
  if (dayColumn < 0 || exerciseColumn < 0)
    return { routine: null, error: "Faltan las columnas «dia» y «ejercicio»." };
  const days = new Map<string, WorkoutDay>();
  for (const row of rows.slice(1)) {
    const day = DAY_ALIASES[plain(row[dayColumn] ?? "")];
    const exercise = (row[exerciseColumn] ?? "").trim();
    if (!day || !exercise) continue;
    const workout = days.get(day) ?? {
      day,
      name: (row[nameColumn] ?? "").trim() || "Entreno",
      exercises: [],
    };
    const number = (name: string, fallback: number) => {
      const raw = column(name) >= 0 ? (row[column(name)] ?? "").trim() : "";
      const value = Number(raw.replace(",", "."));
      return raw && Number.isFinite(value) && value >= 0 ? value : fallback;
    };
    workout.exercises.push({
      name: exercise,
      sets: Math.max(1, Math.round(number("series", 3))),
      reps: column("reps") >= 0 && row[column("reps")]?.trim() ? row[column("reps")].trim() : "12",
      rir: Math.round(number("rir", 2)),
    });
    days.set(day, workout);
  }
  if (!days.size) return { routine: null, error: "No se encontró ningún día con ejercicios." };
  const base = normalizeRoutine(null);
  return {
    routine: syncRoutine({
      ...base,
      id: "routine-import",
      name: "Programa importado",
      variant: "custom",
      cycle: undefined,
      schedule: [...days.values()],
    }),
    error: null,
  };
}
