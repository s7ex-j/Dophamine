import * as SQLite from "expo-sqlite";
import { reloadAppAsync } from "expo";

import { isThemeId, THEME_KEY, type ThemeId } from "@/src/theming/palettes";

/**
 * El tema elegido, leído al arrancar (variante teléfono). Se lee de forma
 * síncrona de la misma tabla de ajustes, porque los estilos se arman una sola
 * vez al cargar la app; cambiar de tema reinicia la app.
 */
export function currentTheme(): ThemeId {
  try {
    const db = SQLite.openDatabaseSync("balance.db");
    const row = db.getFirstSync<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", THEME_KEY);
    const value: unknown = row ? JSON.parse(row.value) : null;
    return isThemeId(value) ? value : "forest";
  } catch {
    // Primera vez (la tabla aún no existe) o cualquier error: el tema de siempre.
    return "forest";
  }
}

/** Reinicia la app para aplicar un tema nuevo. */
export async function applyTheme(): Promise<void> {
  await reloadAppAsync("Tema nuevo");
}
