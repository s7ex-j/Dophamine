// Variante web: Health Connect solo existe en Android. Mismas funciones que la del teléfono.
export type HealthConnectStatus = "available" | "needs-update" | "unavailable";
export type HealthImport = { weights: number; nights: number; stepDays: number; foodDays: number };

export async function healthConnectStatus(): Promise<HealthConnectStatus> {
  return "unavailable";
}

export function openHealthConnect() {}

export async function importFromHealthConnect(_options: { ask?: boolean } = {}): Promise<HealthImport> {
  return { weights: 0, nights: 0, stepDays: 0, foodDays: 0 };
}

export async function syncHealthConnectDaily(): Promise<HealthImport | null> {
  return null;
}
