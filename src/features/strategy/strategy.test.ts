import { describe, expect, it } from "vitest";

import { buildTrajectory, energyOf, signed, trajectoryX } from "@/src/features/strategy/strategy";

const progress = {
  startKg: 80,
  currentKg: 78.4,
  goalKg: 74,
  percent: 27,
  remainingKg: 4.4,
  weeksLeft: 9,
  reached: false,
};
const points = [
  { date: "2026-11-01", weightKg: 80.2, trendKg: 80 },
  { date: "2026-11-24", weightKg: 78.1, trendKg: 78.4 },
];
const eta = { actualWeeks: 7, actualDate: "2027-01-12", direction: "toward" as const };

describe("estrategia", () => {
  it("proyecta desde hoy hasta la fecha de llegada", () => {
    const line = buildTrajectory(points, progress, eta, "2026-11-24");
    expect(line).toMatchObject({ today: 23, end: 72, arrives: true, min: 74, max: 80.2 });
    expect(trajectoryX(line!, 0)).toBe(0);
    expect(trajectoryX(line!, line!.end)).toBe(1);
    expect(trajectoryX(line!, line!.today)).toBeGreaterThanOrEqual(0.3);
  });
  it("sin ritmo hacia la meta no promete una fecha", () => {
    const away = { actualWeeks: null, actualDate: null, direction: "away" as const };
    expect(buildTrajectory(points, progress, away, "2026-11-24")?.arrives).toBe(false);
    expect(buildTrajectory(points.slice(1), progress, eta, "2026-11-24")).toBeNull();
  });
  it("una meta lejana no aplasta lo recorrido", () => {
    const far = { ...eta, actualDate: "2029-01-01" };
    const line = buildTrajectory(points, progress, far, "2026-11-24")!;
    expect(trajectoryX(line, line.today)).toBeCloseTo(0.3);
  });
  it("compara lo que comes con lo que gastas", () => {
    expect(energyOf(2300, 3191)).toMatchObject({ balance: -891, burnShare: 1 });
    expect(energyOf(2300, null)).toMatchObject({ balance: null, eatShare: 1, burnShare: 0 });
  });
  it("escribe el signo", () => {
    expect([signed(50), signed(-0.7, 2), signed(0), signed(-0.001, 2)]).toEqual([
      "+50",
      "−0.70",
      "0",
      "0.00",
    ]);
  });
});
