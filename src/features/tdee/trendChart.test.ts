import { describe, expect, it } from "vitest";

import { trendColumns } from "./trendChart";

const point = (date: string, weightKg: number, trendKg: number) => ({
  date,
  weightKg,
  trendKg,
  caloriesIn: 0,
});

describe("trendColumns", () => {
  it("hace visible una bajada de pocos kilos", () => {
    const columns = trendColumns([
      point("2026-01-01", 79, 78.8),
      point("2026-01-02", 78.2, 78.4),
      point("2026-01-03", 77.1, 77.6),
      point("2026-01-04", 76.5, 76.9),
    ]);
    expect(columns[0].trendPct - columns[3].trendPct).toBeGreaterThan(40);
  });

  it("mantiene todo dentro del área del gráfico", () => {
    const columns = trendColumns([point("a", 80.4, 79.9), point("b", 75.2, 78.1), point("c", 77, 77.5)]);
    for (const column of columns) {
      for (const value of [column.trendPct, column.weightPct]) {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(100);
      }
    }
  });

  it("no falla con pesos idénticos ni con una lista vacía", () => {
    expect(trendColumns([])).toEqual([]);
    const columns = trendColumns([point("a", 70, 70), point("b", 70, 70)]);
    expect(columns.map((column) => column.trendPct)).toEqual([50, 50]);
  });
});
