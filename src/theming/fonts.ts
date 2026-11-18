/**
 * Tipografía de la app, la misma de la página de presentación: Instrument Sans para leer,
 * Bricolage Grotesque para cifras grandes y títulos, y JetBrains Mono solo para la voz de Term.
 * Los archivos van dentro de la app (no se descargan). Cada peso es una familia aparte: en
 * Android y en la web, pedir "negrita" sobre una fuente propia la engorda a la fuerza.
 * Módulo puro: `src/components/Text.tsx` elige la familia con `fontFor`.
 */
export const FONTS = {
  text400: "InstrumentSans_400Regular",
  text500: "InstrumentSans_500Medium",
  text600: "InstrumentSans_600SemiBold",
  text700: "InstrumentSans_700Bold",
  display600: "BricolageGrotesque_600SemiBold",
  display700: "BricolageGrotesque_700Bold",
  mono400: "JetBrainsMono_400Regular",
  mono700: "JetBrainsMono_700Bold",
} as const;

/** Nombres que se pueden escribir en `fontFamily` para pedir un papel en lugar de una familia. */
export const FONT_ROLE = { display: "display", mono: "monospace" } as const;

/** Desde este tamaño, un texto en negrita es una cifra o un título y va con la letra de titulares. */
export const DISPLAY_FROM = 20;

const numericWeight = (weight: unknown): number => {
  if (weight === "bold") return 700;
  if (weight === "normal" || weight === undefined || weight === null) return 400;
  const parsed = Number(weight);
  return Number.isFinite(parsed) ? parsed : 400;
};

/**
 * La familia que corresponde a un estilo de texto. Una familia propia ya resuelta se respeta;
 * "monospace" es la voz de Term; "display" o un texto grande en negrita, la de titulares.
 */
export function fontFor(family: unknown, weight: unknown, size: unknown): string {
  const value = typeof family === "string" ? family : undefined;
  if (value && Object.values(FONTS).includes(value as (typeof FONTS)[keyof typeof FONTS])) return value;
  const w = numericWeight(weight);
  if (value === FONT_ROLE.mono) return w >= 600 ? FONTS.mono700 : FONTS.mono400;
  const big = typeof size === "number" && size >= DISPLAY_FROM;
  if (value === FONT_ROLE.display || (big && w >= 600)) return w >= 700 ? FONTS.display700 : FONTS.display600;
  if (w >= 700) return FONTS.text700;
  if (w >= 600) return FONTS.text600;
  if (w >= 500) return FONTS.text500;
  return FONTS.text400;
}
