import * as Haptics from "expo-haptics";

/**
 * Vibraciones breves, con mesura: elegir algo (tap), confirmar un botón
 * principal (light) y logros reales como completar una serie o cerrar el día
 * (success). Nunca bloquean: si el teléfono no vibra, no pasa nada.
 */
const quiet = (run: () => Promise<void>) => {
  run().catch(() => undefined);
};

export const haptic = {
  tap: () => quiet(() => Haptics.selectionAsync()),
  light: () => quiet(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => quiet(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => quiet(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
