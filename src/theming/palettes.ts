/**
 * Temas de color. El tema base es Bosque (el de siempre): cada color fijo del
 * tema y de los gráficos se escribe en su tono de Bosque y aquí se traduce al
 * tono equivalente de Pastel o de Claro. Así un tema nuevo no obliga a tocar
 * cada pantalla. Módulo puro.
 */
export type ThemeId = "forest" | "pastel" | "light";
export const THEME_KEY = "app_theme";

export const THEMES: Array<{ value: ThemeId; label: string; detail: string }> = [
  { value: "forest", label: "Bosque", detail: "Verde sobre oscuro, el de siempre" },
  { value: "pastel", label: "Pastel", detail: "Lavanda, durazno y menta sobre grafito" },
  { value: "light", label: "Claro", detail: "Fondo claro y alto contraste" },
];

// Bosque → [Pastel, Claro]. Los que no aparecen quedan igual en los tres.
const MAP: Record<string, [string, string]> = {
  // Fondos y superficies
  "#0E1311": ["#1C1A22", "#F4F6F4"],
  "#121815": ["#211E28", "#FFFFFF"],
  "#161C19": ["#26232E", "#FFFFFF"],
  "#1E2622": ["#2E2A38", "#EDF1EE"],
  "#12241D": ["#241F30", "#E8F5EE"],
  "#2A3530": ["#33303D", "#E3E9E5"],
  // Bordes
  "#27302B": ["#3A3545", "#DCE3DF"],
  "#2C3631": ["#3F3A4B", "#D3DBD6"],
  "#4A564F": ["#5C5468", "#A9B5AE"],
  "#2C4A3E": ["#3A3350", "#CFE7DC"],
  "#1F4A39": ["#3A3350", "#CFE7DC"],
  // Texto
  "#F1F5F2": ["#F4F1F8", "#14201A"],
  "#DDE7E1": ["#E6E0EE", "#22302A"],
  "#C5CEC8": ["#D6D0DE", "#33413A"],
  "#9AA59E": ["#ADA6B9", "#55625B"],
  "#8B968F": ["#A39CB0", "#5C6861"],
  "#86C8AA": ["#CBB9E8", "#2A6F53"],
  // Acento
  "#34D399": ["#B8A4F4", "#147455"],
  "#6EE7B7": ["#D3C6FA", "#11674B"],
  "#133126": ["#2E2840", "#DDF1E8"],
  "#1C3A2E": ["#362E4C", "#D4EEE3"],
  "#1C3A2D": ["#362E4C", "#D4EEE3"],
  "#1F3A30": ["#2E2840", "#E1F2EA"],
  "#22704F": ["#8E7BD0", "#1F8F62"],
  "#06281C": ["#1C1A22", "#FFFFFF"],
  // Datos: cada macro con su color armonizado
  "#34D39A": ["#9FE3C8", "#1F9A6F"],
  "#60A5FA": ["#A9C7F5", "#1F5AE0"],
  "#F87171": ["#F7A8A8", "#C81E1E"],
  "#FBBF24": ["#F5D98B", "#8F5E06"],
  "#FB923C": ["#F7B89B", "#B03A0A"],
  "#A78BFA": ["#C9B8F7", "#6D28D9"],
  // Fondos suaves de avisos
  "#16243A": ["#262C3D", "#DBE7FB"],
  "#3A1B1B": ["#3A2630", "#FBE1E1"],
  "#101C2C": ["#232637", "#E8F0FC"],
  "#1E3A5F": ["#3A4060", "#BFD3F2"],
  "#93B4D8": ["#B8C8EC", "#1E40AF"],
  "#BFDBFE": ["#D6E0FA", "#1E3A8A"],
  "#3A3113": ["#3A3326", "#FEF6DC"],
  "#C9B56F": ["#E2CF9A", "#8A6D12"],
  "#FDE9A8": ["#F5E6BC", "#6B5410"],
  "#1F1B0C": ["#1F1B0C", "#1F1B0C"],
  // Mapa muscular
  "#1F5A44": ["#4B4170", "#A7D9C3"],
  "#22936A": ["#8E7BD0", "#3FAE82"],
};

/** El tono de un color de Bosque en el tema pedido. */
export function themed(hex: string, theme: ThemeId): string {
  if (theme === "forest") return hex;
  const pair = MAP[hex.toUpperCase()];
  return pair ? pair[theme === "pastel" ? 0 : 1] : hex;
}

/** Recorre un objeto de estilos y traduce cada color. */
export function remapColors<T>(value: T, theme: ThemeId): T {
  if (theme === "forest") return value;
  const walk = (item: unknown): unknown => {
    if (typeof item === "string") return /^#[0-9A-Fa-f]{6}$/.test(item) ? themed(item, theme) : item;
    if (Array.isArray(item)) return item.map(walk);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).map(([key, inner]) => [key, walk(inner)]),
      );
    return item;
  };
  return walk(value) as T;
}

export const isThemeId = (value: unknown): value is ThemeId =>
  value === "forest" || value === "pastel" || value === "light";

/** El tema que se sugiere en la evaluación según el perfil; siempre se puede cambiar. */
export const suggestedTheme = (sex: "male" | "female"): ThemeId => (sex === "female" ? "pastel" : "forest");
