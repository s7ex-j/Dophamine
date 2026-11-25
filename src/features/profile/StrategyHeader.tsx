import { View } from "react-native";
import { Text } from "@/src/components/Text";

import { Button } from "@/src/components/ui";
import { goalDatePlan, type GoalDate } from "@/src/features/goals/goalDate";
import { VIEWER } from "@/src/lib/mode";
import { convertWeight } from "@/src/lib/units";

import { goalEta, goalProgress, weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { buildTrajectory } from "@/src/features/strategy/strategy";
import { EnergyCard, TrajectoryCard } from "@/src/features/strategy/StrategySections";
import type { MetabolicAnalysis } from "@/src/features/tdee/tdee";
import { localDateKey, longDate } from "@/src/lib/dates";
import { formatWeight } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

/** Lo primero de Estrategia: la trayectoria hacia la meta (con su fecha, si la hay) y la energía del día. */
export function StrategyHeader({
  profile,
  trendKg,
  analysis,
  goalDate = null,
  onApplyCalories,
}: {
  profile: NutritionProfile;
  trendKg: number | null;
  analysis: MetabolicAnalysis;
  goalDate?: GoalDate | null;
  onApplyCalories?: (delta: number) => void;
}) {
  const unit = weightUnitOf(profile);
  const today = localDateKey();
  const progress = goalProgress(profile, trendKg);
  const eta = progress ? goalEta(progress, analysis.weeklyRateKg, today) : null;
  const deadline = goalDate ? (
    <DeadlineLine
      goal={goalDate}
      profile={profile}
      trendKg={trendKg}
      analysis={analysis}
      onApplyCalories={onApplyCalories}
    />
  ) : null;
  return (
    <View style={{ gap: 14 }}>
      {progress ? (
        <TrajectoryCard
          progress={progress}
          eta={eta}
          trajectory={progress.reached ? null : buildTrajectory(analysis.points, progress, eta, today)}
          unit={unit}
        >
          {deadline}
        </TrajectoryCard>
      ) : deadline ? (
        <View style={AppTheme.card}>{deadline}</View>
      ) : null}
      <EnergyCard
        target={profile.calorieTarget}
        tdee={analysis.tdee}
        margin={analysis.tdeeMargin}
        range={analysis.tdeeRange}
        weeklyRateKg={analysis.weeklyRateKg}
        unit={unit}
      />
    </View>
  );
}

/** La meta con fecha en dos líneas: días que faltan, probabilidad y, si hace falta, el ajuste. */
function DeadlineLine({
  goal,
  profile,
  trendKg,
  analysis,
  onApplyCalories,
}: {
  goal: GoalDate;
  profile: NutritionProfile;
  trendKg: number | null;
  analysis: MetabolicAnalysis;
  onApplyCalories?: (delta: number) => void;
}) {
  const unit = weightUnitOf(profile);
  const engine = analysis.adaptive?.active ? analysis.adaptive : null;
  const currentKg = engine?.weightKg ?? trendKg;
  if (currentKg === null) return null;
  const plan = goalDatePlan(goal, localDateKey(), currentKg, profile.calorieTarget, engine);
  const weekly = convertWeight(plan.requiredWeeklyKg, "kg", unit);
  const pace = `${weekly > 0 ? "+" : weekly < 0 ? "−" : ""}${Math.abs(weekly).toFixed(2)} ${unit}/sem`;
  const status =
    plan.daysLeft === 0
      ? "La fecha ya pasó: cámbiala o quítala al reevaluar tu plan."
      : plan.probability === null
        ? `Faltan ${plan.daysLeft} días; hace falta ${pace}. La probabilidad aparece cuando el motor de autoajuste se activa (15 días seguidos con peso y comida).`
        : `Faltan ${plan.daysLeft} días. Probabilidad de llegar: ${Math.round(plan.probability * 100)} %.`;
  const advice =
    plan.daysLeft === 0 || plan.probability === null
      ? null
      : plan.suggestion === 0
        ? plan.overshootKg > 0
          ? `Llegarías unos ${formatWeight(plan.overshootKg, unit, 1)} más allá: puedes comer algo más.`
          : "Vas bien: no hace falta cambiar nada."
        : plan.suggestion === null
          ? "Ni con 300 kcal de cambio diario llegas con seguridad: considera mover la fecha o la meta."
          : null;
  return (
    <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: AppTheme.colors.border, paddingTop: 12 }}>
      <Text style={AppTheme.label}>
        {goal.label ?? "Meta con fecha"}: {formatWeight(goal.weightKg, unit, 1)} para el {longDate(goal.date)}
      </Text>
      <Text style={AppTheme.hint}>{status}</Text>
      {advice ? <Text style={AppTheme.hint}>{advice}</Text> : null}
      {plan.finalStretch ? (
        <Text style={AppTheme.hint}>
          Últimas dos semanas: sin cambios de dieta, entreno algo más suave y pesaje a la misma hora.
        </Text>
      ) : null}
      {plan.suggestion && onApplyCalories && !VIEWER && plan.daysLeft > 0 ? (
        <Button
          title={`Aplicar ${plan.suggestion > 0 ? "+" : "−"}${Math.abs(plan.suggestion)} kcal para llegar`}
          variant="secondary"
          onPress={() => onApplyCalories(plan.suggestion ?? 0)}
        />
      ) : null}
    </View>
  );
}
