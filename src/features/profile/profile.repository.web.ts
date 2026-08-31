import { readStore, writeStore } from "@/src/db/web-storage";
import type { NutritionProfile } from "@/src/features/profile/profile";

export async function getNutritionProfile(): Promise<NutritionProfile | null> { return readStore().profile ?? null; }
export async function saveNutritionProfile(profile: NutritionProfile) { const store = readStore(); store.profile = profile; writeStore(store); }

