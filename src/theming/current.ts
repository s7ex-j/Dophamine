import * as SQLite from "expo-sqlite";

import { isThemeId, THEME_KEY, type ThemeId } from "@/src/theming/palettes";

/**
 * El tema elegido, leído al arrancar (variante teléfono). Se lee de forma
 * síncrona de la misma tabla de ajustes, porque los estilos se arman una sola
 * vez al cargar la app; luego `switchTheme` (live.ts) los cambia al instante.
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
