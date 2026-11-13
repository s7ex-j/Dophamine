import { describe, expect, it } from "vitest";

import { addPhoto, comparePair, daysBetween, readPhotos, removePhoto } from "@/src/features/photos/photos";

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
