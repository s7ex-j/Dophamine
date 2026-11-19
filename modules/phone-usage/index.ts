import { requireOptionalNativeModule } from "expo";

// Módulo propio (Android): cuándo se encendió y apagó la pantalla, para estimar a qué hora te
// dormiste y despertaste. Lee el uso del teléfono con el permiso de "Acceso al uso", que la persona
// da a mano en los ajustes del sistema. Nada sale del teléfono.
export type ScreenEvent = { time: number; on: boolean };

type PhoneUsageNative = {
  hasAccess(): boolean;
  openAccessSettings(): void;
  screenEvents(start: number, end: number): Promise<ScreenEvent[]>;
};

const native = requireOptionalNativeModule<PhoneUsageNative>("PhoneUsage");

/** Si este build trae el módulo (en el navegador o en un build viejo, no). */
export const phoneUsageAvailable = native !== null;
export const hasUsageAccess = () => native?.hasAccess() ?? false;
export const openUsageAccessSettings = () => native?.openAccessSettings();
export const screenEvents = (start: number, end: number) =>
  native ? native.screenEvents(start, end) : Promise.resolve<ScreenEvent[]>([]);
