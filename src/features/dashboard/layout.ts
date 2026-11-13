/**
 * El Panel personalizable: qué secciones se ven y en qué orden. Módulo puro.
 */
export type PanelSection =
  | "habits"
  | "nutrition"
  | "expenditure"
  | "trend"
  | "balance"
  | "goal"
  | "macros"
  | "sleep"
  | "composition"
  | "consistency";
export type PanelLayout = Array<{ id: PanelSection; visible: boolean }>;

export const PANEL_SECTIONS: Array<{ id: PanelSection; label: string }> = [
  { id: "nutrition", label: "Nutrición y metas" },
  { id: "habits", label: "Cumplimiento de hoy" },
  { id: "expenditure", label: "Gasto energético" },
  { id: "trend", label: "Tendencia de peso" },
  { id: "balance", label: "Balance energético" },
  { id: "goal", label: "Progreso de la meta" },
  { id: "macros", label: "Macros de la semana" },
  { id: "sleep", label: "Sueño" },
  { id: "composition", label: "Composición corporal" },
  { id: "consistency", label: "Constancia" },
];

export const DEFAULT_LAYOUT: PanelLayout = PANEL_SECTIONS.map((section) => ({
  id: section.id,
  visible: true,
}));

/**
 * Lee un orden guardado. Descarta lo que no se reconoce y agrega al final,
 * visibles, las secciones que no estaban (las que llegan con una versión nueva).
 */
export function normalizeLayout(value: unknown): PanelLayout {
  if (!Array.isArray(value)) return DEFAULT_LAYOUT;
  const known = new Set<PanelSection>(PANEL_SECTIONS.map((section) => section.id));
  const seen = new Set<PanelSection>();
  const layout: PanelLayout = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const { id, visible } = item as { id?: unknown; visible?: unknown };
    if (typeof id !== "string" || !known.has(id as PanelSection) || seen.has(id as PanelSection)) continue;
    seen.add(id as PanelSection);
    layout.push({ id: id as PanelSection, visible: visible !== false });
  }
  for (const section of PANEL_SECTIONS)
    if (!seen.has(section.id)) layout.push({ id: section.id, visible: true });
  return layout;
}

/** Mueve una sección `delta` lugares (−1 sube, +1 baja). En los bordes no hace nada. */
export function moveSection(layout: PanelLayout, id: PanelSection, delta: number): PanelLayout {
  const from = layout.findIndex((item) => item.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= layout.length) return layout;
  const next = [...layout];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const toggleSection = (layout: PanelLayout, id: PanelSection): PanelLayout =>
  layout.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item));
