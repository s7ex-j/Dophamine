import { describe, expect, it } from "vitest";

import { nightWindow, sleepFromScreen } from "./screenSleep";

const at = (date: string, time: string) => new Date(`${date}T${time}:00`).getTime();

describe("sleepFromScreen", () => {
  it("toma el tramo más largo con la pantalla apagada como la noche", () => {
    const events = [
      { time: at("2026-11-10", "22:10"), on: false },
      { time: at("2026-11-10", "22:40"), on: true },
      { time: at("2026-11-10", "23:35"), on: false },
      { time: at("2026-11-11", "03:00"), on: true },
      { time: at("2026-11-11", "03:02"), on: false },
      { time: at("2026-11-11", "06:50"), on: true },
    ];
    // De 23:35 a 03:00 son 3 h 25; de 03:02 a 06:50, 3 h 48: gana el segundo tramo.
    expect(sleepFromScreen(events, "2026-11-11", at("2026-11-11", "12:00"))).toEqual({
      bedtime: "03:02",
      wakeTime: "06:50",
      quality: null,
    });
  });

  it("no inventa una noche si la pantalla no estuvo apagada 3 horas seguidas", () => {
    const events = [
      { time: at("2026-11-10", "23:00"), on: false },
      { time: at("2026-11-11", "01:00"), on: true },
    ];
    expect(sleepFromScreen(events, "2026-11-11", at("2026-11-11", "12:00"))).toBeNull();
  });

  it("busca entre las 18:00 del día anterior y las 14:00 del día", () => {
    const window = nightWindow("2026-11-11");
    expect(window.start).toBe(at("2026-11-10", "18:00"));
    expect(window.end).toBe(at("2026-11-11", "14:00"));
  });
});
