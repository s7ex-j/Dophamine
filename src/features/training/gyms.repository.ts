import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { ACTIVE_GYM_KEY, activeGym, GYMS_KEY, readGyms, type GymSetup } from "@/src/features/training/gyms";

// Los perfiles de gimnasio viven en ajustes, que ya tienen versión SQLite y web
// (y viajan en el respaldo): este archivo sirve a las dos plataformas.

export async function getGyms(): Promise<{ gyms: GymSetup[]; active: GymSetup }> {
  const [saved, activeId] = await Promise.all([getSetting(GYMS_KEY), getSetting(ACTIVE_GYM_KEY)]);
  const gyms = readGyms(saved);
  return { gyms, active: activeGym(gyms, activeId) };
}

export const saveGyms = (gyms: GymSetup[]) => setSetting(GYMS_KEY, gyms);
export const setActiveGym = (id: string) => setSetting(ACTIVE_GYM_KEY, id);
