type Store = {
  biometrics: Array<{ id: string; date: string; weightKg: number; caloriesIn: number; proteinG: number; carbsG?: number; fatsG?: number }>;
  wellbeing: Array<{ id: string; date: string; mood: number; note: string }>;
  workouts: Array<{ id: string; name: string; completedAt: string }>;
  profile?: { age: number; sex: "female" | "male"; heightCm: number; activity: "low" | "light" | "moderate" | "high"; goal: "gain" | "maintain" | "lose"; calorieTarget: number; proteinTarget: number; carbsTarget: number; fatsTarget: number };
};

const key = "dophamine.web-store.v1";
const empty = (): Store => ({ biometrics: [], wellbeing: [], workouts: [] });

export function readStore(): Store {
  try { return JSON.parse(window.localStorage.getItem(key) ?? "") as Store; } catch { return empty(); }
}

export function writeStore(store: Store) {
  window.localStorage.setItem(key, JSON.stringify(store));
}

export const webId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const webToday = () => new Date().toISOString().slice(0, 10);

