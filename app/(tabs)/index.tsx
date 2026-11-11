import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Screen } from "@/src/components/ui";
import { BackupCard } from "@/src/features/backup/BackupCard";
import { buildWeek, heroMessageFor, nextStepFor } from "@/src/features/dashboard/dashboard";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import {
  CheckInCard,
  DashboardHeader,
  EnergyCard,
  EnergyHero,
  HabitsQuickCard,
  MacrosCard,
  NextStepCard,
  PlanSummaryCard,
  TodayMetrics,
  WeekCard,
  type NutritionView,
} from "@/src/features/dashboard/DashboardSections";
import { DEFAULT_HABITS, dateKey } from "@/src/features/habits/habits";
import { getHabitEntries, toggleHabit, type HabitEntry } from "@/src/features/habits/habits.repository";
import { PlanForm } from "@/src/features/profile/PlanForm";
import { withCalorieTarget } from "@/src/features/profile/profile";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { AppTheme } from "@/src/theme";

// Pantalla "Hoy": carga los datos, decide qué mostrar y compone las secciones.
// El dibujo de cada sección está en DashboardSections y los cálculos en dashboard.ts.
export default function DashboardScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [editingPlan, setEditingPlan] = useState(false);
  const [nutritionView, setNutritionView] = useState<NutritionView>("consumed");

  const load = useCallback(() => {
    Promise.all([getDashboardSnapshot(), getHabitEntries(DEFAULT_HABITS, 31)]).then(
      ([nextSnapshot, nextEntries]) => {
        setSnapshot(nextSnapshot);
        setEntries(nextEntries);
      },
    );
  }, []);
  useEffect(load, [load]);
  useFocusEffect(load);

  const todayHabit = (habitId: string) =>
    entries.find((entry) => entry.id === habitId && entry.date === dateKey())?.completed ?? false;
  const toggleToday = async (habitId: string) => {
    await toggleHabit(habitId);
    load();
  };
  const todayScore = useMemo(() => DEFAULT_HABITS.filter((habit) => todayHabit(habit.id)).length, [entries]);

  if (!snapshot) return <Screen />;
  if (!snapshot.profile || editingPlan)
    return (
      <PlanForm
        profile={snapshot.profile}
        weightKg={snapshot.weightKg}
        onSaved={() => {
          setEditingPlan(false);
          load();
        }}
      />
    );

  const profile = snapshot.profile;
  const calories = snapshot.caloriesIn ?? 0;
  const remainingCalories = Math.max(0, profile.calorieTarget - calories);
  const week = buildWeek(snapshot.recentRecords);
  const nextStep = nextStepFor(Boolean(snapshot.caloriesIn), todayScore, DEFAULT_HABITS.length);
  const openPlan = () => setEditingPlan(true);
  const applyCheckIn = async () => {
    if (!snapshot.checkIn?.suggestedCalories) return;
    await saveNutritionProfile(withCalorieTarget(profile, snapshot.checkIn.suggestedCalories));
    load();
    Alert.alert(
      "Objetivo actualizado",
      `Tu nuevo objetivo diario es ${snapshot.checkIn.suggestedCalories} kcal.`,
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <DashboardHeader profile={profile} openPlan={openPlan} />
        <EnergyHero
          profile={profile}
          remainingCalories={remainingCalories}
          todayScore={todayScore}
          week={week}
          heroMessage={heroMessageFor(snapshot.caloriesIn, profile.calorieTarget)}
        />
        <NextStepCard nextStep={nextStep} openNextStep={() => router.push(nextStep.route)} />
        <EnergyCard
          profile={profile}
          calories={calories}
          remainingCalories={remainingCalories}
          nutritionView={nutritionView}
          setNutritionView={setNutritionView}
        />
        <TodayMetrics snapshot={snapshot} />
        <CheckInCard snapshot={snapshot} applyCheckIn={applyCheckIn} />
        <WeekCard profile={profile} week={week} />
        <HabitsQuickCard todayHabit={todayHabit} toggleToday={toggleToday} />
        <MacrosCard profile={profile} snapshot={snapshot} nutritionView={nutritionView} />
        <PlanSummaryCard profile={profile} snapshot={snapshot} openPlan={openPlan} />
        <BackupCard onRestored={load} />
      </ScrollView>
    </Screen>
  );
}
