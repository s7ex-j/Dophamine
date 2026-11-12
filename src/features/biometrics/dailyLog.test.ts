import { describe, expect, it } from "vitest";

import { addDays, dayLabel } from "@/src/lib/dates";
import { buildBodyInput, emptyForm, formFromRecord, hasData } from "./dailyLog";

const record = {
  id: "1",
  date: "2026-11-10",
  weightKg: 78,
  caloriesIn: 2100,
  proteinG: 150,
  carbsG: 0,
  fatsG: 70,
  bodyFatPct: 18.5,
  muscleMassKg: 36,
  waterPct: null,
  boneMassKg: null,
};

describe("peso y composición del diario", () => {
  it("pide el peso y rechaza valores imposibles", () => {
    expect(buildBodyInput(emptyForm(), "kg").error).toContain("peso");
    expect(buildBodyInput({ ...emptyForm(), weight: "500" }, "kg").error).toContain("rango");
  });

  it("guarda solo el peso si no se llenó nada más", () => {
    expect(buildBodyInput({ ...emptyForm(), weight: "78.4" }, "kg").input).toEqual({
      weightKg: 78.4,
      bodyFatPct: null,
      muscleMassKg: null,
      waterPct: null,
      boneMassKg: null,
    });
  });

  it("convierte a kg el peso y las masas escritas en libras; los porcentajes no cambian", () => {
    const form = { weight: "172", bodyFat: "18.5", muscle: "80", water: "58", bone: "7" };
    const input = buildBodyInput(form, "lb").input;
    expect(input?.weightKg).toBeCloseTo(78.02, 2);
    expect(input?.muscleMassKg).toBeCloseTo(36.29, 2);
    expect(input?.boneMassKg).toBeCloseTo(3.18, 2);
    expect(input).toMatchObject({ bodyFatPct: 18.5, waterPct: 58 });
  });

  it("explica qué medida de composición está mal", () => {
    expect(buildBodyInput({ ...emptyForm(), weight: "78", bodyFat: "95" }, "kg").error).toContain(
      "el % de grasa",
    );
    expect(buildBodyInput({ ...emptyForm(), weight: "78", muscle: "90" }, "kg").error).toContain(
      "masa muscular",
    );
  });

  it("llena el formulario desde un registro guardado, en la unidad elegida", () => {
    expect(formFromRecord(record, "kg")).toEqual({
      weight: "78",
      bodyFat: "18.5",
      muscle: "36",
      water: "",
      bone: "",
    });
    expect(formFromRecord(record, "lb").weight).toBe("172");
    expect(formFromRecord(record, "lb").muscle).toBe("79.4");
    expect(formFromRecord(null, "kg")).toEqual(emptyForm());
  });

  it("un día con comida y sin pesaje deja el peso vacío", () => {
    expect(formFromRecord({ ...record, weightKg: null }, "kg").weight).toBe("");
  });

  it("distingue un día con datos de uno vacío", () => {
    expect(hasData(record)).toBe(true);
    expect(hasData({ ...record, weightKg: null, bodyFatPct: null })).toBe(true);
    expect(hasData({ ...record, weightKg: null, caloriesIn: 0, proteinG: 0, bodyFatPct: null })).toBe(false);
    expect(hasData(null)).toBe(false);
  });
});

describe("fechas del diario", () => {
  it("avanza y retrocede días cruzando meses", () => {
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("nombra hoy y ayer, y abrevia el resto", () => {
    expect(dayLabel("2026-11-11", "2026-11-11")).toBe("Hoy");
    expect(dayLabel("2026-11-10", "2026-11-11")).toBe("Ayer");
    expect(dayLabel("2026-11-05", "2026-11-11")).toMatch(/5/);
  });
});
