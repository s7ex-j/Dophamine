import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";

import { IconTabs, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { DayMeals } from "@/src/features/nutrition/DayMeals";
import { NutrientSummary } from "@/src/features/nutrition/NutrientSummary";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { dayLabel, localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

type Tab = "meals" | "summary";

// Registrar comida: las comidas del día según el plan (por nombre o por número) y, al lado, el resumen de
// nutrientes (anillos de macros y micros, y de dónde salió cada uno).
export default function MealsScreen() {
  const params = useLocalSearchParams<{ date?: string; view?: string }>();
  const date =
    typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : localDateKey();
  const [view, setView] = useState<Tab>(params.view === "summary" ? "summary" : "meals");
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  useFocusEffect(
    useCallback(() => {
      getNutritionProfile().then(setProfile);
    }, []),
  );
  if (VIEWER) return <ViewerOnlyNotice what="Registrar comida" />;
  return (
    <Screen>
      <Stack.Screen options={{ title: `Comidas · ${dayLabel(date)}` }} />
      <ScrollView contentContainerStyle={AppTheme.content}>
        <IconTabs
          value={view}
          onChange={setView}
          options={[
            { value: "meals", label: "Comidas", icon: "restaurant-outline" },
            { value: "summary", label: "Nutrientes", icon: "pie-chart-outline" },
          ]}
        />
        {profile ? (
          view === "meals" ? (
            <DayMeals date={date} profile={profile} />
          ) : (
            <NutrientSummary date={date} profile={profile} />
          )
        ) : null}
      </ScrollView>
    </Screen>
  );
}
