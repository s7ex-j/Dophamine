// En el teléfono no hay visor: la app siempre va en su formato de celular.
// La variante web (viewerLayout.web.ts) deja elegir entre vista ancha y de celular.
export type ViewerLayout = "wide" | "phone";
export const VIEWER_WIDE = false;
export const VIEWER_LAYOUT: ViewerLayout = "phone";
export function setViewerLayout(_layout: ViewerLayout) {}
