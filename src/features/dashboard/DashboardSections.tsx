import { Pressable, Text, View } from "react-native";

import { Button, Card, ChoiceControl, ListRow, Metric, ProgressBar } from "@/src/components/ui";
import type { WeekDay, NextStep } from "@/src/features/dashboard/dashboard";
import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { DEFAULT_HABITS } from "@/src/features/habits/habits";
import { goalLabels, weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { nextReviewDate } from "@/src/features/reviews/reviews";
import { formatWeight } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

// Las secciones del tablero "Hoy". Cada una recibe solo lo que dibuja; los
// cálculos viven en dashboard.ts y la carga de datos en la pantalla.

export type NutritionView = "consumed" | "remaining";

export function DashboardHeader({ profile, openPlan }: { profile: NutritionProfile; openPlan: () => void }) {
  return (
    <View style={AppTheme.dashboardHeader}>
      <View>
        <Text style={AppTheme.eyebrow}>
          {goalLabels[profile.goal].toUpperCase()} · DÍA {new Date().getDate()}
        </Text>
        <Text style={AppTheme.title}>Tu tablero.</Text>
      </View>
      <Pressable onPress={openPlan} style={AppTheme.headerAction}>
        <Text style={AppTheme.headerActionText}>Plan</Text>
      </Pressable>
    </View>
  );
}

export function EnergyHero({
  profile,
  remainingCalories,
  todayScore,
  week,
  heroMessage,
}: {
  profile: NutritionProfile;
  remainingCalories: number;
  todayScore: number;
  week: WeekDay[];
  heroMessage: string;
}) {
  return (
    <View style={AppTheme.hero}>
      <View style={AppTheme.heroTop}>
        <View>
          <Text style={AppTheme.heroKicker}>ENERGÍA DISPONIBLE</Text>
          <Text style={AppTheme.heroNumber}>{remainingCalories}</Text>
          <Text style={AppTheme.heroUnit}>kcal restantes de {profile.calorieTarget}</Text>
        </View>
        <View style={AppTheme.heroScore}>
          <Text style={AppTheme.heroScoreNumber}>{todayScore}</Text>
          <Text style={AppTheme.heroScoreLabel}>de 5</Text>
        </View>
      </View>
      <View style={AppTheme.heroRail}>
        {week.map(({ key, day, record }) => (
          <View key={key} style={AppTheme.heroRailDay}>
            <View
              style={[
                AppTheme.heroRailDot,
                record && {
                  backgroundColor:
                    record.caloriesIn > profile.calorieTarget * 1.1
                      ? AppTheme.colors.coral
                      : AppTheme.colors.amber,
                },
              ]}
            />
            <Text style={AppTheme.heroRailLabel}>{day}</Text>
          </View>
        ))}
      </View>
      <Text style={AppTheme.heroMessage}>{heroMessage}</Text>
    </View>
  );
}

export function NextStepCard({ nextStep, openNextStep }: { nextStep: NextStep; openNextStep: () => void }) {
  return (
    <View style={AppTheme.nextStep}>
      <View style={AppTheme.nextStepCopy}>
        <Text style={AppTheme.nextStepEyebrow}>SIGUIENTE PASO</Text>
        <Text style={AppTheme.nextStepTitle}>{nextStep.title}</Text>
        <Text style={AppTheme.nextStepDetail}>{nextStep.detail}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={openNextStep} style={AppTheme.nextStepAction}>
        <Text style={AppTheme.nextStepActionText}>{nextStep.action}</Text>
      </Pressable>
    </View>
  );
}

export function EnergyCard({
  profile,
  calories,
  remainingCalories,
  nutritionView,
  setNutritionView,
}: {
  profile: NutritionProfile;
  calories: number;
  remainingCalories: number;
  nutritionView: NutritionView;
  setNutritionView: (view: NutritionView) => void;
}) {
  const calorieProgress = (calories / profile.calorieTarget) * 100;
  return (
    <Card title="Energía de hoy">
      <ChoiceControl
        value={nutritionView}
        onChange={setNutritionView}
        options={[
          { value: "consumed", label: "Consumido" },
          { value: "remaining", label: "Restante" },
        ]}
      />
      <View style={AppTheme.energyTop}>
        <View>
          <Text style={AppTheme.energyNumber}>
            {nutritionView === "consumed" ? calories : remainingCalories}
          </Text>
          <Text style={AppTheme.hint}>
            {nutritionView === "consumed" ? `de ${profile.calorieTarget} kcal` : "kcal restantes"}
          </Text>
        </View>
        <View style={AppTheme.scoreBadge}>
          <Text style={AppTheme.scoreNumber}>{Math.round(calorieProgress)}%</Text>
          <Text style={AppTheme.scoreLabel}>meta</Text>
        </View>
      </View>
      <ProgressBar
        value={calorieProgress}
        color={calorieProgress > 110 ? AppTheme.colors.coral : AppTheme.colors.blue}
      />
      <Text style={AppTheme.hint}>
        {calories
          ? `${Math.abs(profile.calorieTarget - calories)} kcal ${calories <= profile.calorieTarget ? "por completar" : "por encima de la meta"}`
          : "Registra tus datos de hoy para activar el análisis."}
      </Text>
    </Card>
  );
}

export function TodayMetrics({ snapshot }: { snapshot: DashboardSnapshot }) {
  const protein = snapshot.proteinG ?? 0;
  return (
    <View style={AppTheme.metricGrid}>
      <Metric
        label="Peso"
        value={snapshot.weightKg ? formatWeight(snapshot.weightKg, weightUnitOf(snapshot.profile)) : "--"}
      />
      <Metric label="Proteína" value={`${protein} g`} />
      <Metric label="TDEE" value={snapshot.tdee ? `${snapshot.tdee}` : "--"} />
      <Metric label="Ánimo" value={snapshot.mood ? `${snapshot.mood}/5` : "--"} />
    </View>
  );
}

export function CheckInCard({
  snapshot,
  applyCheckIn,
  dismissCheckIn,
}: {
  snapshot: DashboardSnapshot;
  applyCheckIn: () => void;
  dismissCheckIn: () => void;
}) {
  const hasProposal = Boolean(
    snapshot.checkIn?.ready && snapshot.checkIn.delta && Math.abs(snapshot.checkIn.delta) >= 25,
  );
  return snapshot.checkIn ? (
    <Card title="Revisión semanal">
      <View style={AppTheme.checkInTop}>
        <View
          style={[
            AppTheme.statusPill,
            snapshot.checkIn.status === "updating"
              ? AppTheme.statusUpdating
              : snapshot.checkIn.status === "holding"
                ? AppTheme.statusHolding
                : AppTheme.statusBuilding,
          ]}
        >
          <Text style={AppTheme.statusPillText}>
            {snapshot.checkIn.status === "updating"
              ? "Actualizando"
              : snapshot.checkIn.status === "holding"
                ? "En pausa"
                : "Construyendo"}
          </Text>
        </View>
        <Text style={AppTheme.hint}>
          {snapshot.analysis.nutritionDaysLast7}/7 ingestas · {snapshot.analysis.weightDaysLast7}/7 pesajes
        </Text>
      </View>
      <Text style={AppTheme.body}>{snapshot.checkIn.message}</Text>
      {hasProposal && snapshot.reviewDue ? (
        <>
          <Button title={`Aplicar ${snapshot.checkIn.suggestedCalories} kcal`} onPress={applyCheckIn} />
          <Button title="Mantener mi objetivo actual" variant="secondary" onPress={dismissCheckIn} />
        </>
      ) : null}
      {hasProposal && !snapshot.reviewDue ? (
        <Text style={AppTheme.hint}>
          Ya respondiste la revisión de esta semana. La próxima propuesta llega el{" "}
          {nextReviewDate(snapshot.lastReview)}.
        </Text>
      ) : null}
    </Card>
  ) : null;
}

export function WeekCard({ profile, week }: { profile: NutritionProfile; week: WeekDay[] }) {
  return (
    <Card title="Semana en una mirada">
      <View style={AppTheme.weeklyBars}>
        {week.map(({ key, day, record }) => (
          <View key={key} style={AppTheme.weeklyBarColumn}>
            <View style={AppTheme.weeklyBarTrack}>
              {record ? (
                <View
                  style={[
                    AppTheme.weeklyBarFill,
                    {
                      height: `${Math.min(100, (record.caloriesIn / profile.calorieTarget) * 100)}%`,
                      backgroundColor:
                        record.caloriesIn > profile.calorieTarget * 1.1
                          ? AppTheme.colors.coral
                          : AppTheme.colors.blue,
                    },
                  ]}
                />
              ) : (
                <View style={AppTheme.weeklyBarEmpty} />
              )}
            </View>
            <Text style={AppTheme.weeklyBarLabel}>{day}</Text>
          </View>
        ))}
      </View>
      <Text style={AppTheme.hint}>
        Las columnas coloreadas comparan tus calorías con la meta; las vacías son oportunidades de registro.
      </Text>
    </Card>
  );
}

export function HabitsQuickCard({
  todayHabit,
  toggleToday,
}: {
  todayHabit: (habitId: string) => boolean;
  toggleToday: (habitId: string) => void;
}) {
  return (
    <Card title="Adherencia de hoy">
      <View style={AppTheme.habitQuickRow}>
        {DEFAULT_HABITS.map((habit) => (
          <Pressable
            key={habit.id}
            onPress={() => toggleToday(habit.id)}
            style={[
              AppTheme.habitQuick,
              todayHabit(habit.id) && { backgroundColor: habit.color, borderColor: habit.color },
            ]}
          >
            <Text style={[AppTheme.habitQuickText, todayHabit(habit.id) && { color: "#FFFFFF" }]}>
              {habit.shortLabel}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={AppTheme.hint}>Marca lo que ya hiciste. El historial mensual vive en Hábitos.</Text>
    </Card>
  );
}

export function MacrosCard({
  profile,
  snapshot,
  nutritionView,
}: {
  profile: NutritionProfile;
  snapshot: DashboardSnapshot;
  nutritionView: NutritionView;
}) {
  const protein = snapshot.proteinG ?? 0;
  const proteinProgress = (protein / profile.proteinTarget) * 100;
  const macroValue = (current: number, target: number) =>
    nutritionView === "consumed" ? current : Math.max(0, target - current);
  return (
    <Card title="Macros y recuperación">
      <ListRow
        title="Proteína"
        detail={`${macroValue(protein, profile.proteinTarget)} g ${nutritionView === "consumed" ? "consumidos" : "restantes"}`}
        value={`${Math.round(proteinProgress)}%`}
      />
      <ProgressBar value={proteinProgress} color={AppTheme.colors.coral} />
      <ListRow
        title="Carbohidratos"
        detail={`${macroValue(snapshot.carbsG ?? 0, profile.carbsTarget)} g ${nutritionView === "consumed" ? "consumidos" : "restantes"}`}
        value={`${Math.round(((snapshot.carbsG ?? 0) / profile.carbsTarget) * 100)}%`}
      />
      <ProgressBar
        value={((snapshot.carbsG ?? 0) / profile.carbsTarget) * 100}
        color={AppTheme.colors.amber}
      />
      <ListRow
        title="Grasas"
        detail={`${macroValue(snapshot.fatsG ?? 0, profile.fatsTarget)} g ${nutritionView === "consumed" ? "consumidas" : "restantes"}`}
        value={`${Math.round(((snapshot.fatsG ?? 0) / profile.fatsTarget) * 100)}%`}
      />
      <ProgressBar
        value={((snapshot.fatsG ?? 0) / profile.fatsTarget) * 100}
        color={AppTheme.colors.accent}
      />
    </Card>
  );
}

export function PlanSummaryCard({
  profile,
  snapshot,
  openPlan,
}: {
  profile: NutritionProfile;
  snapshot: DashboardSnapshot;
  openPlan: () => void;
}) {
  return (
    <Card title="Plan y tendencia">
      <ListRow
        title="TDEE observado"
        detail={
          snapshot.tdee
            ? "Se ajusta con tu historial de peso e ingesta"
            : "Se activará al reunir registros suficientes"
        }
        value={snapshot.tdee ? `${snapshot.tdee} kcal` : "En espera"}
      />
      <ListRow
        title="Objetivo actual"
        detail={`${profile.proteinTarget} g proteína · ${profile.carbsTarget} g carbohidratos · ${profile.fatsTarget} g grasas`}
        value={`${profile.calorieTarget} kcal`}
      />
      <Button title="Editar plan" onPress={openPlan} variant="secondary" />
    </Card>
  );
}
