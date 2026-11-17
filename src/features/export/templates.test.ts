import { describe, expect, it } from "vitest";

import dietTemplate from "@/docs/formatos/dieta.dophamine-diet.json?raw";
import routineTemplate from "@/docs/formatos/rutina.csv?raw";
import dietOnSite from "@/web/public/formatos/dieta.dophamine-diet.json?raw";
import routineOnSite from "@/web/public/formatos/rutina.csv?raw";
import { importDietFile } from "@/src/features/diet/format";
import { parseProgram } from "@/src/features/export/export";

// Las plantillas que se descargan desde el sitio: tienen que leerse en la app tal cual,
// y la copia del sitio (web/public/formatos) tiene que ser idéntica a la de docs/formatos.
describe("plantillas descargables", () => {
  it("la copia del sitio es la misma que la de docs", () => {
    expect(dietOnSite).toBe(dietTemplate);
    expect(routineOnSite).toBe(routineTemplate);
  });

  it("la plantilla de dieta se importa completa", () => {
    const plan = importDietFile(JSON.parse(dietTemplate), "2026-11-17");
    expect(plan.days).toHaveLength(7);
  });

  it("la plantilla de rutina se importa con sus cuatro días", () => {
    const result = parseProgram(routineTemplate);
    expect(result.error).toBeNull();
    expect(result.routine?.schedule.map((day) => day.day)).toEqual(["mon", "tue", "thu", "fri"]);
    expect(result.routine?.schedule[1].exercises[0]).toMatchObject({
      name: "Sentadilla",
      sets: 3,
      reps: "6-8",
      rir: 2,
    });
  });
});
