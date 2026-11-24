import { describe, expect, it } from "vitest";

import { agoLabel, habitsTile, measurementsTile, streakTile, wellbeingTile } from "@/src/features/more/more";

const ALL = { calories: true, water: true, weight: true, training: true, sleep: true, wellbeing: true };

describe("datos de la pantalla Más", () => {
  it("dice qué falta del día", () => {
    expect(habitsTile(null).value).toBe("—");
    expect(habitsTile(ALL)).toEqual({ value: "6 de 6", detail: "Día completo" });
    expect(habitsTile({ ...ALL, water: false }).detail).toBe("Falta agua");
    expect(habitsTile({ ...ALL, water: false, sleep: false }).detail).toBe("Faltan agua y sueño");
    expect(habitsTile({ ...ALL, water: false, sleep: false, weight: false }).detail).toBe("Faltan 3 hoy");
  });
  it("muestra el ánimo de hoy o invita a anotarlo", () => {
    expect(wellbeingTile(4).value).toBe("Bien");
    expect(wellbeingTile(null).value).toBe("Sin anotar");
  });
  it("compara la racha con el récord", () => {
    expect(streakTile(1, 1)).toEqual({ value: "1 día", detail: "Es tu récord" });
    expect(streakTile(3, 20)).toEqual({ value: "3 días", detail: "Récord: 20" });
    expect(streakTile(0, 0).detail).toBe("Registra hoy y empieza");
  });
  it("prefiere la cintura y muestra el cambio", () => {
    expect(measurementsTile([]).value).toBe("Sin medir");
    expect(
      measurementsTile([
        { date: "2026-10-01", waistCm: 84, armCm: 33 },
        { date: "2026-11-01", waistCm: 82 },
      ]),
    ).toEqual({ value: "82 cm", detail: "Cintura, −2 en total" });
    expect(measurementsTile([{ date: "2026-10-01", armCm: 33 }])).toEqual({
      value: "33 cm",
      detail: "Brazo",
    });
  });
  it("dice hace cuánto fue", () => {
    expect(agoLabel(null, "2026-11-24")).toBe("");
    expect(agoLabel("2026-11-24", "2026-11-24")).toBe("hoy");
    expect(agoLabel("2026-11-23", "2026-11-24")).toBe("ayer");
    expect(agoLabel("2026-10-31", "2026-11-24")).toBe("hace 24 días");
  });
});
