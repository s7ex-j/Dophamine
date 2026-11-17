import { describe, expect, it } from "vitest";

import {
  addPhoto,
  comparePair,
  comparisonStats,
  daysBetween,
  readPhotos,
  removePhoto,
} from "@/src/features/photos/photos";

const photo = (id: string, date: string, pose: "front" | "side" | "back" = "front") => ({
  id,
  date,
  file: `${id}.jpg`,
  pose,
});

describe("fotos de progreso", () => {
  it("se ordenan de la más reciente a la más antigua y se descarta lo roto", () => {
    const list = readPhotos([photo("a", "2026-09-01"), { id: "x" }, photo("b", "2026-11-01"), null]);
    expect(list.map((item) => item.id)).toEqual(["b", "a"]);
    expect(readPhotos("nada")).toEqual([]);
  });

  it("compara la primera y la última de la misma pose", () => {
    let list = addPhoto([], photo("a", "2026-09-01"));
    expect(comparePair(list, "front")).toBeNull();
    list = addPhoto(list, photo("s", "2026-10-01", "side"));
    list = addPhoto(list, photo("b", "2026-10-15"));
    list = addPhoto(list, photo("c", "2026-11-13"));
    const pair = comparePair(list, "front");
    expect(pair?.before.id).toBe("a");
    expect(pair?.after.id).toBe("c");
    expect(daysBetween(pair!.before.date, pair!.after.date)).toBe(73);
    expect(removePhoto(list, "c").map((item) => item.id)).toEqual(["b", "s", "a"]);
  });
});

describe("comparar dos fotos", () => {
  const before = { id: "a", date: "2026-09-01", file: "a.jpg", pose: "front" as const, weightKg: 81 };
  const after = { id: "b", date: "2026-11-17", file: "b.jpg", pose: "front" as const, weightKg: 79.4 };
  it("usa el peso real del motor si existe para las dos fechas, y la cintura más cercana", () => {
    const stats = comparisonStats(
      before,
      after,
      [
        { date: "2026-09-01", weightKg: 80.2 },
        { date: "2026-11-17", weightKg: 78.1 },
      ],
      [
        { date: "2026-08-28", waistCm: 86 },
        { date: "2026-11-15", waistCm: 83 },
        { date: "2026-10-01", waistCm: 85 },
      ],
    );
    expect(stats).toEqual({
      days: 77,
      beforeKg: 80.2,
      afterKg: 78.1,
      realWeight: true,
      waistCm: { before: 86, after: 83 },
    });
  });
  it("sin motor usa el peso anotado con la foto y sin medidas cercanas no inventa cintura", () => {
    const stats = comparisonStats(before, after, [], [{ date: "2026-06-01", waistCm: 90 }]);
    expect(stats).toMatchObject({ beforeKg: 81, afterKg: 79.4, realWeight: false, waistCm: null });
  });
});
