import { describe, expect, it } from "vitest";

import {
  copyToAllDays,
  dayError,
  defaultConfig,
  formatTime,
  MOTIVATION,
  normalizeConfig,
  normalizeTime,
  parseTime,
  phraseFor,
  remindersToSchedule,
  sortMeals,
  templateMeals,
  TEMPLATE_SIZES,
  weekdayOf,
} from "./reminders";

let counter = 0;
const newId = () => `r${(counter += 1)}`;

describe("horas", () => {
  it("entiende varias formas de escribir una hora", () => {
    expect(parseTime("7:30")).toBe(450);
    expect(parseTime("07:30")).toBe(450);
    expect(parseTime("0730")).toBe(450);
    expect(parseTime("7.30")).toBe(450);
    expect(parseTime("13")).toBe(780);
    expect(parseTime("23:59")).toBe(1439);
  });

  it("rechaza horas imposibles", () => {
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("7:75")).toBeNull();
    expect(parseTime("siete")).toBeNull();
    expect(parseTime("")).toBeNull();
  });

  it("escribe siempre HH:MM", () => {
    expect(formatTime(450)).toBe("07:30");
    expect(formatTime(-2)).toBe("23:58");
    expect(normalizeTime("7.5")).toBe("07:05");
    expect(normalizeTime("x")).toBeNull();
  });
});

describe("comidas del día", () => {
  it("ofrece plantillas de 2 a 6 comidas, ordenadas por hora", () => {
    expect(TEMPLATE_SIZES).toEqual([2, 3, 4, 5, 6]);
    for (const size of TEMPLATE_SIZES) {
      const meals = templateMeals(size, newId);
      expect(meals).toHaveLength(size);
      expect(sortMeals(meals)).toEqual(meals);
      expect(dayError(meals)).toBeNull();
    }
  });

  it("empieza apagado, con 3 comidas cada día y aviso 5 minutos antes", () => {
    const config = defaultConfig(newId);
    expect(config.enabled).toBe(false);
    expect(config.leadMinutes).toBe(5);
    expect(Object.values(config.days).every((meals) => meals.length === 3)).toBe(true);
  });

  it("copia un día a toda la semana con ids nuevos", () => {
    const config = defaultConfig(newId);
    config.days.sat = templateMeals(5, newId);
    const copied = copyToAllDays(config, "sat", newId);
    expect(Object.values(copied.days).every((meals) => meals.length === 5)).toBe(true);
    expect(copied.days.mon[0].id).not.toBe(copied.days.sat[0].id);
    expect(copied.days.mon.map((meal) => meal.time)).toEqual(copied.days.sat.map((meal) => meal.time));
  });

  it("explica qué está mal en un día", () => {
    const meals = templateMeals(3, newId);
    expect(dayError([...meals, { id: "x", label: "Extra", time: "25:00" }])).toContain("horas");
    expect(dayError([...meals, { id: "x", label: " ", time: "10:00" }])).toContain("nombre");
    expect(dayError([...meals, { id: "x", label: "Otra", time: "07:30" }])).toContain("misma hora");
  });
});

describe("avisos a programar", () => {
  it("no programa nada si está apagado", () => {
    expect(remindersToSchedule(defaultConfig(newId))).toEqual([]);
  });

  it("programa un aviso por comida y día, unos minutos antes", () => {
    const config = { ...defaultConfig(newId), enabled: true };
    const scheduled = remindersToSchedule(config);
    expect(scheduled).toHaveLength(21);
    // Lunes (2 para el sistema) desayuno 07:30 → aviso 07:25
    expect(scheduled[0]).toMatchObject({ weekday: 2, hour: 7, minute: 25, title: "Desayuno en 5 min" });
    expect(MOTIVATION).toContain(scheduled[0].body);
    // El domingo es 1 para el sistema.
    expect(scheduled.at(-1)?.weekday).toBe(1);
  });

  it("si el aviso cae antes de medianoche pasa al día anterior", () => {
    const config = { ...defaultConfig(newId), enabled: true };
    config.days.mon = [{ id: "a", label: "Snack", time: "00:03" }];
    const monday = remindersToSchedule(config).filter((item) => item.title.startsWith("Snack"));
    expect(monday).toEqual([expect.objectContaining({ weekday: 1, hour: 23, minute: 58 })]);
  });

  it("usa la anticipación elegida", () => {
    const config = { ...defaultConfig(newId), enabled: true, leadMinutes: 15 };
    expect(remindersToSchedule(config)[0]).toMatchObject({
      hour: 7,
      minute: 15,
      title: "Desayuno en 15 min",
    });
  });

  it("varía la frase entre comidas", () => {
    expect(new Set([0, 1, 2].map((meal) => phraseFor(0, meal))).size).toBe(3);
  });
});

describe("configuración guardada", () => {
  it("completa lo que falta y descarta horas inválidas", () => {
    const config = normalizeConfig(
      {
        enabled: true,
        leadMinutes: 999,
        days: { mon: [{ label: "Cena", time: "8:00" }, { label: "Mala", time: "99" }, "nada"] },
      },
      newId,
    );
    expect(config.enabled).toBe(true);
    expect(config.leadMinutes).toBe(5);
    expect(config.days.mon).toEqual([expect.objectContaining({ label: "Cena", time: "08:00" })]);
    expect(config.days.tue).toHaveLength(3);
  });

  it("sin nada guardado devuelve la configuración por defecto", () => {
    expect(normalizeConfig(null, newId).enabled).toBe(false);
    expect(normalizeConfig("roto", newId).days.sun).toHaveLength(3);
  });

  it("sabe qué día de la semana es una fecha local", () => {
    expect(weekdayOf(new Date(2026, 10, 9))).toBe("mon");
    expect(weekdayOf(new Date(2026, 10, 15))).toBe("sun");
  });
});

describe("recordatorio de pesaje", () => {
  it("avisa todos los días a la hora elegida, aunque los de comida estén apagados", () => {
    const config = { ...defaultConfig(() => "x"), enabled: false, weighIn: { enabled: true, time: "6:45" } };
    const scheduled = remindersToSchedule(normalizeConfig(config, () => "x"));
    expect(scheduled).toHaveLength(7);
    expect(scheduled[0]).toMatchObject({ weekday: 2, hour: 6, minute: 45, title: "Hora de pesarte" });
    expect(remindersToSchedule({ ...config, weighIn: { enabled: false, time: "06:45" } })).toEqual([]);
  });
});
