import { describe, expect, it } from "vitest";

import { themed, type ThemeId } from "./palettes";

// Contraste WCAG: el texto se lee en los tres temas (4.5:1 para texto normal).
const luminance = (hex: string) => {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

// Colores escritos en su tono de Bosque, como en src/theme.ts.
const SURFACES = { background: "#0E1311", surface: "#161C19", surface2: "#1E2622", hero: "#12241D" };
const TEXT = {
  text: "#F1F5F2",
  body: "#C5CEC8",
  muted: "#8B968F",
  accent: "#34D399",
  accentText: "#6EE7B7",
  coral: "#F87171",
  amber: "#FBBF24",
  kcal: "#60A5FA",
  warning: "#FB923C",
  violet: "#A78BFA",
  water: "#22D3EE",
  sleep: "#F472B6",
};
const THEMES: ThemeId[] = ["forest", "pastel", "light"];

describe("contraste de los temas", () => {
  for (const theme of THEMES)
    it(`el texto se lee sobre cada superficie en ${theme}`, () => {
      const failures: string[] = [];
      for (const [textName, text] of Object.entries(TEXT))
        for (const [surfaceName, surface] of Object.entries(SURFACES)) {
          const ratio = contrast(themed(text, theme), themed(surface, theme));
          if (ratio < 4.5) failures.push(`${textName} sobre ${surfaceName}: ${ratio.toFixed(2)}`);
        }
      expect(failures).toEqual([]);
    });

  it("el texto de los botones se lee sobre el acento", () => {
    for (const theme of THEMES)
      expect(contrast(themed("#06281C", theme), themed("#34D399", theme))).toBeGreaterThanOrEqual(4.5);
  });
});
