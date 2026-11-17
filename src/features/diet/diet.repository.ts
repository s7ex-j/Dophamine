import { DAY_STATE_KEY, readDayState, type DayState } from "@/src/features/diet/coach";
import { DIET_KEY, readDiet, type DietPlan } from "@/src/features/diet/diet";
import { HEALTH_KEY, readHealth, type HealthProfile } from "@/src/features/health/health";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";

// La dieta, el estado de hoy y el perfil de salud viven en ajustes, que ya
// tienen versión SQLite y web y viajan en el respaldo: sirve a las dos plataformas.

export const getDiet = async (): Promise<DietPlan | null> => readDiet(await getSetting(DIET_KEY));
export const saveDiet = (plan: DietPlan | null) => setSetting(DIET_KEY, plan);

export const getDayState = async (date: string): Promise<DayState> =>
  readDayState(await getSetting(DAY_STATE_KEY), date);
export const saveDayState = (state: DayState) => setSetting(DAY_STATE_KEY, state);

export const getHealth = async (): Promise<HealthProfile> => readHealth(await getSetting(HEALTH_KEY));
export const saveHealth = (health: HealthProfile) => setSetting(HEALTH_KEY, health);
