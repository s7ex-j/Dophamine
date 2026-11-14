import { describe, expect, it } from "vitest";

import type { Store } from "@/src/db/web-storage";
import {
  dailyCsv,
  mealsCsv,
  parseCsv,
  parseProgram,
  programCsv,
  programJson,
  setsCsv,
  toCsv,
} from "@/src/features/export/export";
import { generateRoutine, workoutFor } from "@/src/features/training/training.plans";

const store: Store = {
  biometrics: [
    {
      id: "a",
      date: "2026-11-12",
      weightKg: 70.4,
      caloriesIn: 2500,
      proteinG: 140,
      carbsG: 300,
      fatsG: 70,
      waterMl: 2000,
    },
    { id: "b", date: "2026-11-13", weightKg: null, caloriesIn: 0, proteinG: 0, fasting: true },
  ],
  wellbeing: [],
  workouts: [
    {
      id: "w",
      name: "Torso, A",
      startedAt: "2026-11-12T18:00:00",
      completedAt: "2026-11-12T19:00:00",
      sets: [
        { exerciseName: "Press de banca", setNumber: 1, type: "working", loadKg: 60, reps: 10, rir: 2 },
        {
          exerciseName: "Remo con mancuerna",
          setNumber: 1,
          type: "working",
          loadKg: 24,
          reps: 10,
          rir: 2,
          side: "left",
        },
      ],
    },
  ],
  meals: [
    {
      id: "m",
      date: "2026-11-12",
      slot: "lunch",
      name: 'Arroz "chaufa"',
      grams: 200,
      kcal: 260,
      proteinG: 5,
      carbsG: 56,
      fatsG: 1,
    },
  ],
  sleep: [
    { id: "s", date: "2026-11-12", bedtime: "23:00", wakeTime: "07:00", quality: null, source: "manual" },
  ],
};

describe("exportar a CSV", () => {
  it("escapa comas y comillas, y empieza con la marca UTF-8", () => {
    const csv = toCsv([["a", "b,c", 'd"e', null]]);
    expect(csv).toBe('﻿a,"b,c","d""e",\r\n');
  });

  it("un día por fila con peso, comida, agua, sueño, entreno y ayuno", () => {
    const rows = parseCsv(dailyCsv(store));
    expect(rows[0][0]).toBe("fecha");
    expect(rows[1]).toEqual([
      "2026-11-12",
      "70.4",
      "",
      "",
      "2500",
      "140",
      "300",
      "70",
      "2000",
      "480",
      "sí",
      "",
      "",
    ]);
    expect(rows[2].at(-1)).toBe("sí");
  });

  it("comidas y series con sus datos", () => {
    const meals = parseCsv(mealsCsv(store));
    expect(meals[1][2]).toBe('Arroz "chaufa"');
    const sets = parseCsv(setsCsv(store));
    expect(sets[1]).toEqual([
      "2026-11-12",
      "Torso, A",
      "Press de banca",
      "1",
      "working",
      "",
      "60",
      "10",
      "2",
    ]);
    expect(sets[2][5]).toBe("left");
  });
});

describe("programas", () => {
  const routine = generateRoutine({
    variant: "ppl6",
    gymProfile: "full_gym",
    trainingGoal: "hypertrophy",
    sessionMinutes: 50,
  });

  it("el JSON exportado se vuelve a leer igual", () => {
    const back = parseProgram(programJson(routine));
    expect(back.error).toBeNull();
    expect(back.routine?.schedule).toEqual(routine.schedule);
    expect(back.routine?.name).toBe(routine.name);
  });

  it("el CSV exportado se vuelve a leer", () => {
    const back = parseProgram(programCsv(routine)).routine!;
    expect(back.days).toEqual(routine.days);
    expect(workoutFor(back, "thu")?.exercises.map((item) => item.name)).toEqual(
      workoutFor(routine, "thu")?.exercises.map((item) => item.name),
    );
  });

  it("acepta un CSV escrito a mano, con punto y coma y días en español", () => {
    const csv =
      "Día;Entreno;Ejercicio;Series;Reps\nLunes;Pecho;Press de banca;4;6-8\nlunes;Pecho;Fondos en paralelas;;\nJueves;Pierna;Sentadilla con barra;5;5";
    const result = parseProgram(csv);
    expect(result.error).toBeNull();
    expect(result.routine?.days).toEqual(["mon", "thu"]);
    expect(workoutFor(result.routine!, "mon")?.exercises).toEqual([
      { name: "Press de banca", sets: 4, reps: "6-8", rir: 2 },
      { name: "Fondos en paralelas", sets: 3, reps: "12", rir: 2 },
    ]);
  });

  it("rechaza archivos sin programa", () => {
    expect(parseProgram("{nada").error).toContain("JSON");
    expect(parseProgram('{"hola": 1}').error).toContain("programa");
    expect(parseProgram("a,b\n1,2").error).toContain("dia");
  });
});
