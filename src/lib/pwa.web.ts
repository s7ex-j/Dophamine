// La web instalable (PWA): la app completa en el navegador, pensada para iPhone. Es otra compilación
// (`EXPO_PUBLIC_PWA=1`), publicada en /Dophamine/pwa, para no mezclarse con el visor de /Dophamine/app.
export const PWA = process.env.EXPO_PUBLIC_PWA === "1";

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as { standalone?: boolean }).standalone === true;

// Los iPad recientes se presentan como Mac con pantalla táctil.
const ios = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * iPhone abierto en Safari, sin instalar: lo guardado ahí no pasa a la app instalada y Safari lo puede
 * borrar. Por eso se pide instalar antes de empezar.
 */
export const needsInstall = () => PWA && ios() && !standalone();

/** Pide al navegador que no borre los datos por falta de espacio. */
export async function keepStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Si no lo permite, los datos se guardan igual.
  }
}
