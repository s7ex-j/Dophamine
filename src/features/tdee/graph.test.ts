import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import { contextualCheckIn } from "@/src/features/tdee/checkin";
import { algorithmGraph } from "@/src/features/tdee/graph";
import { analyzeMetabolism } from "@/src/features/tdee/tdee";
import { addDays } from "@/src/lib/dates";

const profile = buildNutritionProfile({
  age: 25,
  sex: "male",
  heightCm: 175,
  weightKg: 70,
  activity: "moderate",
  goal: "lose",
  pace: "moderate",
});

function snapshot(days: number): DashboardSnapshot {
  const records: DailyBiometrics[] = Array.from({ length: days }, (_, index) => ({
    id: String(index),
    date: addDays("2026-10-01", index),
    weightKg: 70 + (index % 2 ? 0.3 : -0.3),
    caloriesIn: 2400,
    proteinG: 140,
    carbsG: 250,
    fatsG: 70,
  }));
  const analysis = analyzeMetabolism(records);
  return {
    weightKg: 70,
    trendKg: 70,
    caloriesIn: 2400,
    proteinG: 140,
    carbsG: 250,
    fatsG: 70,
    tdee: analysis.tdee,
    mood: null,
    profile,
    analysis,
    checkIn: contextualCheckIn(analysis, profile, { recent: records.slice(-7), sleepMinutes: 420 }),
    recentRecords: records.slice(-7),
    records: [...records].reverse(),
    lastReview: null,
    reviewDue: true,
    training: null,
    period: 7,
    sleepMinutes: 420,
    periods: [],
  };
}

describe("cómo se calcula, como red", () => {
  it("tiene cuatro capas y cada arista une nodos que existen", () => {
    const graph = algorithmGraph(snapshot(30), "2026-10-30");
    expect(new Set(graph.nodes.map((node) => node.layer))).toEqual(new Set([0, 1, 2, 3]));
    const ids = new Set(graph.nodes.map((node) => node.id));
    for (const edge of graph.edges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
    // Todo lo que registras llega, por algún camino, al objetivo.
    const reaches = (from: string, seen = new Set<string>()): boolean =>
      from === "target" ||
      graph.edges.some(
        (edge) => edge.from === from && !seen.has(edge.to) && reaches(edge.to, new Set([...seen, from])),
      );
    for (const node of graph.nodes.filter((item) => item.layer === 0)) expect(reaches(node.id)).toBe(true);
  });

  it("con el motor activo muestra peso real, agua y ruido con tus números", () => {
    const graph = algorithmGraph(snapshot(30), "2026-10-30");
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    expect(byId.get("noise")?.active).toBe(true);
    expect(byId.get("trueWeight")?.value).toMatch(/^7\d\.\d$/);
    expect(byId.get("expenditure")?.formula).toContain("máxima verosimilitud");
    expect(byId.get("review")?.formula).toContain("no incluye el cero");
  });

  it("sin datos suficientes los nodos se apagan y sus líneas se atenúan", () => {
    const graph = algorithmGraph(snapshot(5), "2026-10-05");
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    expect(byId.get("noise")?.active).toBe(false);
    expect(byId.get("water")?.detail).toContain("15 días seguidos");
    const edge = graph.edges.find((item) => item.from === "scale" && item.to === "noise");
    expect(edge?.strength).toBeLessThan(0.3);
  });
});
