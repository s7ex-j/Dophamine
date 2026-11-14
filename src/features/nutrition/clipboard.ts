import type { MealDraft, MealEntry, MealSlot } from "@/src/features/nutrition/meals";

/**
 * Copiar y pegar: una comida (los alimentos de un momento) o un día entero, a
 * cualquier fecha. Lo copiado se guarda en ajustes (`meal_clipboard`) hasta
 * que se copie otra cosa. Módulo puro.
 */
export const CLIPBOARD_KEY = "meal_clipboard";

export type Clipboard =
  | { kind: "meal"; label: string; from: string; drafts: MealDraft[] }
  | { kind: "day"; label: string; from: string; slots: Array<{ slot: MealSlot; drafts: MealDraft[] }> };

const toDraft = ({ id: _id, date: _date, slot: _slot, ...draft }: MealEntry): MealDraft => draft;

export function copyMeal(entries: MealEntry[], label: string): Clipboard | null {
  return entries.length ? { kind: "meal", label, from: entries[0].date, drafts: entries.map(toDraft) } : null;
}

export function copyWholeDay(entries: MealEntry[], date: string): Clipboard | null {
  if (!entries.length) return null;
  const slots = [...new Set(entries.map((entry) => entry.slot))].map((slot) => ({
    slot,
    drafts: entries.filter((entry) => entry.slot === slot).map(toDraft),
  }));
  return { kind: "day", label: date, from: date, slots };
}

/** Lo que hay que agregar al pegar: en el momento elegido (comida) o en sus mismos momentos (día). */
export function pastePlan(
  clipboard: Clipboard,
  slot?: MealSlot,
): Array<{ slot: MealSlot; drafts: MealDraft[] }> {
  if (clipboard.kind === "day") return clipboard.slots;
  return slot ? [{ slot, drafts: clipboard.drafts }] : [];
}

export const clipboardKcal = (clipboard: Clipboard) =>
  Math.round(
    (clipboard.kind === "meal" ? clipboard.drafts : clipboard.slots.flatMap((item) => item.drafts)).reduce(
      (sum, draft) => sum + draft.kcal,
      0,
    ),
  );

/** Lee lo guardado; null si no tiene forma de copia. */
export function readClipboard(value: unknown): Clipboard | null {
  if (!value || typeof value !== "object") return null;
  const clip = value as Partial<Clipboard> & { drafts?: unknown; slots?: unknown };
  if (clip.kind === "meal" && Array.isArray(clip.drafts) && clip.drafts.length) return clip as Clipboard;
  if (clip.kind === "day" && Array.isArray(clip.slots) && clip.slots.length) return clip as Clipboard;
  return null;
}
