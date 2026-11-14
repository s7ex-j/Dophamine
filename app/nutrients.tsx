import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Card, Chips, Screen } from "@/src/components/ui";
import {
  NUTRIENT_LABELS,
  proteinPerMeal,
  slotDistribution,
  topContributors,
  type NutrientKey,
} from "@/src/features/nutrition/insights";
import { DEFAULT_MEAL_SETUP, type MealEntry, type MealSetup } from "@/src/features/nutrition/meals";
import { getMealHistory } from "@/src/features/nutrition/nutrition.repository";
import { mealSetupOf } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { addDays, localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

const COLORS: Record<NutrientKey, string> = {
  kcal: AppTheme.colors.kcal,
  proteinG: AppTheme.colors.protein,
  carbsG: AppTheme.colors.carbs,
  fatsG: AppTheme.colors.fats,
  alcoholG: AppTheme.colors.violet,
};

// Qué alimentos aportan más de cada nutriente y cómo repartes lo que comes en el día.
export default function NutrientsScreen() {
  const [history, setHistory] = useState<MealEntry[]>([]);
  const [setup, setSetup] = useState<MealSetup>(DEFAULT_MEAL_SETUP);
  const [days, setDays] = useState(30);
  const [key, setKey] = useState<NutrientKey>("proteinG");
  useFocusEffect(
    useCallback(() => {
      Promise.all([getMealHistory(3000), getNutritionProfile()]).then(([entries, profile]) => {
        setHistory(entries);
        setSetup(mealSetupOf(profile));
      });
    }, []),
  );
  const since = addDays(localDateKey(), -(days - 1));
  const entries = history.filter((entry) => entry.date >= since);
  const top = topContributors(entries, key);
  const slots = slotDistribution(entries, setup).filter((slot) => slot.kcal > 0);
  const protein = proteinPerMeal(entries);
  const maxShare = Math.max(1, ...slots.map((slot) => slot.share));
  const hasAlcohol = entries.some((entry) => entry.alcoholG);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Chips
          value={days}
          onChange={setDays}
          options={[
            { value: 7, label: "7 días" },
            { value: 30, label: "30 días" },
            { value: 90, label: "90 días" },
          ]}
        />
        <Card title="Principales aportes">
          <Chips
            value={key}
            onChange={setKey}
            options={(Object.keys(NUTRIENT_LABELS) as NutrientKey[])
              .filter((item) => item !== "alcoholG" || hasAlcohol)
              .map((value) => ({ value, label: NUTRIENT_LABELS[value].label }))}
          />
          {top.length ? (
            top.map((item) => (
              <View key={item.name} style={{ gap: 4 }}>
                <View style={AppTheme.legendRow}>
                  <Text style={[AppTheme.legendLabel, { flex: 1 }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={AppTheme.legendValue}>
                    {item.amount} {NUTRIENT_LABELS[key].unit} · {item.share} %
                  </Text>
                </View>
                <View style={AppTheme.progressTrack}>
                  <View
                    style={[AppTheme.goalFill, { width: `${item.share}%`, backgroundColor: COLORS[key] }]}
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={AppTheme.body}>Registra comidas para ver de dónde sale cada nutriente.</Text>
          )}
          <Text style={AppTheme.hint}>Suma de todo el periodo, por alimento.</Text>
        </Card>

        <Card title="Cómo repartes el día">
          {slots.length ? (
            slots.map((slot) => (
              <View key={slot.slot} style={{ gap: 4 }}>
                <View style={AppTheme.legendRow}>
                  <Text style={AppTheme.legendLabel}>{slot.label}</Text>
                  <Text style={AppTheme.legendValue}>
                    {slot.kcal} kcal · {slot.proteinG} g prot · {slot.share} %
                  </Text>
                </View>
                <View style={AppTheme.progressTrack}>
                  <View
                    style={[
                      AppTheme.goalFill,
                      { width: `${(slot.share / maxShare) * 100}%`, backgroundColor: AppTheme.colors.kcal },
                    ]}
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={AppTheme.body}>Aún no hay comidas en este periodo.</Text>
          )}
          {protein.meals ? (
            <Text style={AppTheme.body}>
              {protein.withTwenty} de {protein.meals} comidas llegaron a 20 g de proteína (media{" "}
              {protein.average} g). Repartirla en 3–5 comidas con 20–40 g cada una ayuda a aprovecharla.
            </Text>
          ) : null}
          <Text style={AppTheme.hint}>Promedio por día con registros.</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
