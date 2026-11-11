import { describe, expect, it } from "vitest";
import { localDateKey } from "./dates";

describe("localDateKey", () => {
  it("usa el día del reloj local, no el de UTC", () => {
    // 9 p. m. del 10 de noviembre en el dispositivo.
    const noche = new Date(2026, 10, 10, 21, 0, 0);
    expect(localDateKey(noche)).toBe("2026-11-10");
  });

  it("no retrocede un día a medianoche", () => {
    expect(localDateKey(new Date(2026, 0, 1, 0, 0, 0))).toBe("2026-01-01");
  });

  it("rellena mes y día con ceros", () => {
    expect(localDateKey(new Date(2026, 2, 5, 12))).toBe("2026-03-05");
  });
});
