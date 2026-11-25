import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  settings: {} as Record<string, unknown>,
  granted: true,
  scheduled: [] as Array<{ enabled: boolean }>,
  files: ["esta.jpg"],
}));
vi.mock("@/src/features/settings/settings.repository", () => ({
  getSetting: async (key: string) => state.settings[key] ?? null,
  setSetting: async (key: string, value: unknown) => {
    state.settings[key] = value;
  },
}));
vi.mock("@/src/features/photos/photos.storage", () => ({
  PHOTOS_SUPPORTED: true,
  photoUri: (file: string) => (state.files.includes(file) ? `file:///${file}` : null),
}));
vi.mock("@/src/features/reminders/scheduler", () => ({
  remindersAvailable: true,
  requestPermission: async () => state.granted,
  scheduleReminders: async (config: { enabled: boolean }) => {
    state.scheduled.push(config);
    return 1;
  },
}));

import { afterRestore } from "@/src/features/backup/afterRestore";

const photo = (id: string, file: string) => ({ id, file, date: "2026-11-01", pose: "front" });

describe("después de restaurar", () => {
  beforeEach(() => {
    state.settings = { meal_reminders: { enabled: true } };
    state.granted = true;
    state.scheduled = [];
  });
  it("vuelve a programar los avisos del respaldo", async () => {
    expect(await afterRestore()).toBeNull();
    expect(state.scheduled).toHaveLength(1);
    expect(state.scheduled[0].enabled).toBe(true);
  });
  it("sin permiso avisa y no deja los avisos de los datos anteriores", async () => {
    state.granted = false;
    expect(await afterRestore()).toContain("Recordatorios");
    expect(state.scheduled[0].enabled).toBe(false);
  });
  it("con los avisos apagados no pide permiso y limpia los que hubiera", async () => {
    state.settings = {};
    state.granted = false;
    expect(await afterRestore()).toBeNull();
    expect(state.scheduled).toHaveLength(1);
  });
  it("quita solo las fotos cuya imagen no está", async () => {
    state.settings.progress_photos = [photo("1", "esta.jpg"), photo("2", "otra.jpg")];
    await afterRestore();
    expect((state.settings.progress_photos as Array<{ id: string }>).map((item) => item.id)).toEqual(["1"]);
  });
});
