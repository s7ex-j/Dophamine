/**
 * Temas de color. El tema base es Bosque (el de siempre): cada color fijo del
 * tema y de los gráficos se escribe en su tono de Bosque y aquí se traduce al
 * tono equivalente de Claro, Rosa noche o Rosa día. Así un tema nuevo no obliga a tocar
 * cada pantalla. Módulo puro.
 */
// "pastel" es el nombre guardado de Rosa noche: antes fue un tema morado. Se conserva para que quien lo
// usaba pase al nuevo y los respaldos anteriores se lean igual.
export type ThemeId = "forest" | "light" | "pastel" | "rose";
export const THEME_KEY = "app_theme";

export const THEMES: Array<{ value: ThemeId; label: string; detail: string }> = [
  { value: "forest", label: "Bosque", detail: "Verde sobre oscuro, el de siempre" },
  { value: "light", label: "Claro", detail: "Verde sobre fondo claro" },
  { value: "pastel", label: "Rosa noche", detail: "Rosa pastel sobre oscuro" },
  { value: "rose", label: "Rosa día", detail: "Rosa sobre fondo claro" },
];

// Bosque → [Rosa noche, Claro, Rosa día]. Los que no aparecen quedan igual en todos.
const MAP: Record<string, [string, string, string]> = {
  // Fondos y superficies
  "#0E1311": ["#1D1519", "#F4F6F4", "#FFF5F7"],
  "#121815": ["#22191E", "#FFFFFF", "#FFFFFF"],
  "#161C19": ["#271C22", "#FFFFFF", "#FFFFFF"],
  "#1E2622": ["#31242B", "#EDF1EE", "#FBE8ED"],
  "#12241D": ["#2E1B24", "#E8F5EE", "#FDE6ED"],
  "#2A3530": ["#3A2A32", "#E3E9E5", "#F5DCE3"],
  // Bordes
  "#27302B": ["#443139", "#DCE3DF", "#F3D7DF"],
  "#2C3631": ["#4A353F", "#D3DBD6", "#EDCBD5"],
  "#4A564F": ["#6B515C", "#A9B5AE", "#C9A2AF"],
  "#2C4A3E": ["#4A2A38", "#CFE7DC", "#F6CCD9"],
  "#1F4A39": ["#4A2A38", "#CFE7DC", "#F6CCD9"],
  // Texto
  "#F1F5F2": ["#FBF1F4", "#14201A", "#2B1720"],
  "#DDE7E1": ["#F0DFE5", "#22302A", "#3A2430"],
  "#C5CEC8": ["#E0CDD4", "#33413A", "#4A333F"],
  "#9AA59E": ["#BFA7B1", "#55625B", "#75586A"],
  "#8B968F": ["#B59DA7", "#5C6861", "#785A68"],
  "#86C8AA": ["#F0B5CA", "#2A6F53", "#A32A58"],
  // Acento
  "#34D399": ["#F48DB8", "#147455", "#BE3166"],
  "#6EE7B7": ["#FBC0D8", "#11674B", "#A32A58"],
  "#133126": ["#3D2430", "#DDF1E8", "#FCE0E9"],
  "#1C3A2E": ["#482A38", "#D4EEE3", "#FAD3E0"],
  "#1C3A2D": ["#482A38", "#D4EEE3", "#FAD3E0"],
  "#1F3A30": ["#3D2430", "#E1F2EA", "#FDE6ED"],
  "#22704F": ["#B85E82", "#1F8F62", "#D15482"],
  "#06281C": ["#1D1519", "#FFFFFF", "#FFFFFF"],
  // Datos: cada macro con su color armonizado
  "#34D39A": ["#86DDB5", "#1F9A6F", "#1B8A66"],
  "#60A5FA": ["#86BBFA", "#1F5AE0", "#1F5AE0"],
  "#F87171": ["#F7986E", "#C81E1E", "#B4400A"],
  "#FBBF24": ["#F2E08C", "#8F5E06", "#7A6400"],
  "#FB923C": ["#EFC05A", "#B03A0A", "#8A5200"],
  // Agua y sueño en los objetivos del día
  "#22D3EE": ["#7FE0E0", "#0E7490", "#0E7490"],
  "#F472B6": ["#E79BE6", "#BE185D", "#A21CAF"],
  "#A78BFA": ["#C0A4FA", "#6D28D9", "#6D28D9"],
  // Fondos suaves de avisos
  "#16243A": ["#262C3D", "#DBE7FB", "#DBE7FB"],
  "#3A1B1B": ["#3A2630", "#FBE1E1", "#FBE1E1"],
  "#101C2C": ["#232637", "#E8F0FC", "#E8F0FC"],
  "#1E3A5F": ["#3A4060", "#BFD3F2", "#BFD3F2"],
  "#93B4D8": ["#B8C8EC", "#1E40AF", "#1E40AF"],
  "#BFDBFE": ["#D6E0FA", "#1E3A8A", "#1E3A8A"],
  "#3A3113": ["#3A3326", "#FEF6DC", "#FEF6DC"],
  "#C9B56F": ["#E2CF9A", "#8A6D12", "#8A6D12"],
  "#FDE9A8": ["#F5E6BC", "#6B5410", "#6B5410"],
  "#1F1B0C": ["#1F1B0C", "#1F1B0C", "#1F1B0C"],
  // Mapa muscular
  "#1F5A44": ["#5E3348", "#A7D9C3", "#F2B6CB"],
  "#22936A": ["#B85E82", "#3FAE82", "#D9638F"],
};

const COLUMN = { pastel: 0, light: 1, rose: 2 } as const;
/** Los temas de fondo claro (la barra de estado del teléfono va con íconos oscuros). */
export const isLightTheme = (theme: ThemeId) => theme === "light" || theme === "rose";

/** El tono de un color de Bosque en el tema pedido. */
export function themed(hex: string, theme: ThemeId): string {
  if (theme === "forest") return hex;
  const tones = MAP[hex.toUpperCase()];
  return tones ? tones[COLUMN[theme]] : hex;
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

export const isThemeId = (value: unknown): value is ThemeId => THEMES.some((theme) => theme.value === value);

/** El tema que se sugiere en la evaluación según el perfil; siempre se puede cambiar. */
export const suggestedTheme = (sex: "male" | "female"): ThemeId => (sex === "female" ? "pastel" : "forest");
