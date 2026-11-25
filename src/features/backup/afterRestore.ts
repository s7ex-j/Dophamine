import { PHOTOS_KEY, keepPhotos, readPhotos } from "@/src/features/photos/photos";
import { PHOTOS_SUPPORTED, photoUri } from "@/src/features/photos/photos.storage";
import { anyReminder, normalizeConfig, REMINDERS_KEY } from "@/src/features/reminders/reminders";
import { remindersAvailable, requestPermission, scheduleReminders } from "@/src/features/reminders/scheduler";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Lo que un respaldo no puede traer consigo, y hay que poner al día después de restaurar:
 * los avisos (viven en el sistema, no en los datos) y las fotos cuya imagen no está en este
 * teléfono. Devuelve un aviso para la persona, o null. Si algo falla, los datos ya están a salvo.
 */
export async function afterRestore(): Promise<string | null> {
  try {
    if (PHOTOS_SUPPORTED) {
      const photos = readPhotos(await getSetting(PHOTOS_KEY));
      const kept = keepPhotos(photos, (file) => photoUri(file) !== null);
      if (kept.length < photos.length) await setSetting(PHOTOS_KEY, kept);
    }
  } catch {
    // Las fotos sin imagen no se muestran: no hace falta avisar.
  }
  if (!remindersAvailable) return null;
  const notice = "Tus recordatorios no quedaron programados: ábrelos en Más → Recordatorios y guárdalos.";
  try {
    const config = normalizeConfig(await getSetting(REMINDERS_KEY), newId);
    // Sin avisos encendidos también se llama: borra los que hubiera de los datos anteriores.
    if (anyReminder(config) && !(await requestPermission())) {
      await scheduleReminders({ ...config, enabled: false, weighIn: undefined, preWorkout: undefined });
      return notice;
    }
    await scheduleReminders(config);
    return null;
  } catch {
    return notice;
  }
}
