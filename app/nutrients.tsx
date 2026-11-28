import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/src/components/ui";
import { NutrientSummary } from "@/src/features/nutrition/NutrientSummary";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

// El resumen de nutrientes vive en Comida (pestaña Nutrientes); esta ruta lo abre solo, para enlaces viejos.
export default function NutrientsScreen() {
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  useFocusEffect(
    useCallback(() => {
      getNutritionProfile().then(setProfile);
    }, []),
  );
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        {profile ? <NutrientSummary date={localDateKey()} profile={profile} /> : null}
      </ScrollView>
    </Screen>
  );
}
