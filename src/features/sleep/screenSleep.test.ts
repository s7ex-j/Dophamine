import { describe, expect, it } from "vitest";

import { autoSleepSettingOf, nightWindow, shouldCheckSleep, sleepFromScreen } from "./screenSleep";

const at = (date: string, time: string) => new Date(`${date}T${time}:00`).getTime();

describe("sleepFromScreen", () => {
  it("toma el tramo más largo con la pantalla apagada como la noche", () => {
    const events = [
      { time: at("2026-11-10", "22:10"), on: false },
      { time: at("2026-11-10", "22:40"), on: true },
      { time: at("2026-11-10", "23:35"), on: false },
      { time: at("2026-11-11", "03:00"), on: true },
      { time: at("2026-11-11", "03:30"), on: false },
      { time: at("2026-11-11", "07:20"), on: true },
    ];
    // De 23:35 a 03:00 son 3 h 25; de 03:30 a 07:20, 3 h 50: gana el segundo (media hora despierto sí corta).
    expect(sleepFromScreen(events, "2026-11-11", at("2026-11-11", "12:00"))).toEqual({
      bedtime: "03:30",
      wakeTime: "07:20",
      quality: null,
    });
  });

  it("un encendido corto en la noche (mirar la hora) no la parte en dos", () => {
    const events = [
      { time: at("2026-11-10", "23:40"), on: false },
      { time: at("2026-11-11", "01:30"), on: true },
      { time: at("2026-11-11", "01:32"), on: false },
      { time: at("2026-11-11", "04:10"), on: true },
      { time: at("2026-11-11", "04:18"), on: false },
      { time: at("2026-11-11", "07:05"), on: true },
    ];
    // Ningún tramo llega solo a 3 horas; unidos, de 23:40 a 07:05.
    expect(sleepFromScreen(events, "2026-11-11", at("2026-11-11", "12:00"))).toEqual({
      bedtime: "23:40",
      wakeTime: "07:05",
      quality: null,
    });
  });

  it("si la pantalla sigue apagada, la noche no terminó", () => {
    const events = [{ time: at("2026-11-10", "23:40"), on: false }];
    expect(sleepFromScreen(events, "2026-11-11", at("2026-11-11", "06:00"))).toBeNull();
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

describe("sueño con el teléfono, al abrir el Panel", () => {
  const base = { date: "2026-11-11", today: "2026-11-11", hasAccess: true, hasNight: false };
  it("por defecto guarda solo, una vez por día", () => {
    const setting = autoSleepSettingOf(null);
    expect(setting).toEqual({ mode: "save", checked: null });
    expect(shouldCheckSleep({ ...base, setting })).toBe(true);
    expect(shouldCheckSleep({ ...base, setting: { mode: "save", checked: "2026-11-11" } })).toBe(false);
  });
  it("no calcula sin permiso, con la noche ya anotada, en otro día o si se apagó", () => {
    const setting = autoSleepSettingOf({ mode: "ask" });
    expect(shouldCheckSleep({ ...base, setting })).toBe(true);
    expect(shouldCheckSleep({ ...base, setting, hasAccess: false })).toBe(false);
    expect(shouldCheckSleep({ ...base, setting, hasNight: true })).toBe(false);
    expect(shouldCheckSleep({ ...base, setting, date: "2026-11-10" })).toBe(false);
    expect(shouldCheckSleep({ ...base, setting: autoSleepSettingOf({ mode: "off" }) })).toBe(false);
    expect(autoSleepSettingOf({ mode: "raro", checked: 3 })).toEqual({ mode: "save", checked: null });
  });
});
