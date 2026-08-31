import { readStore, webId, writeStore } from "@/src/db/web-storage";

export type Workout = { id: string; name: string; completedAt: string };
export async function completePosteriorWorkout() {
  const store = readStore();
  store.workouts.unshift({ id: webId(), name: "Rutina A · cadena posterior", completedAt: new Date().toISOString() });
  writeStore(store);
}
export async function getRecentWorkouts(): Promise<Workout[]> { return readStore().workouts.slice(0, 6); }

