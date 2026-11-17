/** En el navegador no hay vibración: mismas funciones, sin efecto. */
const none = () => undefined;

export const haptic = { tap: none, light: none, success: none, warning: none };
