import { View } from "react-native";
import { Text } from "@/src/components/Text";

import { Button } from "@/src/components/ui";
import { goalDatePlan, type GoalDate } from "@/src/features/goals/goalDate";
import { VIEWER } from "@/src/lib/mode";
import { convertWeight } from "@/src/lib/units";

import {
  goalEta,
  goalLabels,
  goalProgress,
  weightUnitOf,
  type NutritionProfile,
} from "@/src/features/profile/profile";
import type { MetabolicAnalysis } from "@/src/features/tdee/tdee";
import { localDateKey } from "@/src/lib/dates";
import { formatWeight } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

/**
 * Lo primero de Estrategia: hacia dónde vas y con qué números. La meta con su
 * barra de avance y fecha estimada, y cuatro cifras en fila: objetivo, gasto,
 * ritmo real y margen del gasto. Si hay meta con fecha (se elige en la
 * evaluación), dice cuántos días faltan y la probabilidad de llegar.
 */
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
  const progress = goalProgress(profile, trendKg);
  const eta = progress ? goalEta(progress, analysis.weeklyRateKg, localDateKey()) : null;
  const rate = analysis.weeklyRateKg;
  const figures: Array<{ label: string; value: string; unit: string }> = [
    { label: "Objetivo", value: String(profile.calorieTarget), unit: "kcal" },
    { label: "Gasto", value: analysis.tdee ? String(analysis.tdee) : "—", unit: "kcal" },
    {
      label: "Ritmo",
      value: rate === null ? "—" : `${rate > 0 ? "+" : rate < 0 ? "−" : ""}${Math.abs(rate).toFixed(2)}`,
      unit: `${unit}/sem`,
    },
    { label: "Margen", value: analysis.tdeeMargin ? `±${analysis.tdeeMargin}` : "—", unit: "kcal" },
  ];
  return (
    <View style={[AppTheme.card, { gap: 14 }]}>
      <View style={{ gap: 2 }}>
        <Text style={AppTheme.title}>{goalLabels[profile.goal]}</Text>
        <Text style={AppTheme.hint}>
          {profile.proteinTarget} g proteína · {profile.carbsTarget} g carbohidratos · {profile.fatsTarget} g
          grasas
        </Text>
      </View>
      {progress ? (
        <View style={{ gap: 6 }}>
          <View style={AppTheme.sectionHeader}>
            <Text style={AppTheme.label}>
              {formatWeight(progress.startKg, unit, 1)} → {formatWeight(progress.goalKg, unit, 1)}
            </Text>
            <Text style={[AppTheme.label, { color: AppTheme.colors.accent }]}>{progress.percent} %</Text>
          </View>
          <View style={AppTheme.goalTrack}>
            <View style={[AppTheme.goalFill, { width: `${progress.percent}%` }]} />
          </View>
          <Text style={AppTheme.hint}>
            {progress.reached
              ? "Llegaste a tu peso meta."
              : eta?.direction === "toward"
                ? `Faltan ${formatWeight(progress.remainingKg, unit, 1)}. A tu ritmo real llegarías hacia el ${eta.actualDate}.`
                : eta?.direction === "away"
                  ? `Faltan ${formatWeight(progress.remainingKg, unit, 1)}. Tu ritmo real te está alejando de la meta.`
                  : `Faltan ${formatWeight(progress.remainingKg, unit, 1)}${progress.weeksLeft ? `, unas ${progress.weeksLeft} semanas al ritmo del plan` : ""}.`}
          </Text>
        </View>
      ) : null}
      {goalDate ? (
        <DeadlineLine
          goal={goalDate}
          profile={profile}
          trendKg={trendKg}
          analysis={analysis}
          onApplyCalories={onApplyCalories}
        />
      ) : null}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: AppTheme.colors.border,
          paddingTop: 12,
        }}
      >
        {figures.map((figure, index) => (
          <View
            key={figure.label}
            style={[
              { flex: 1, gap: 2 },
              index > 0 && { borderLeftWidth: 1, borderLeftColor: AppTheme.colors.border, paddingLeft: 10 },
            ]}
          >
            <Text style={[AppTheme.hint, { fontSize: 11 }]}>{figure.label}</Text>
            <Text style={[AppTheme.tileValue, { fontSize: 17 }]} numberOfLines={1} adjustsFontSizeToFit>
              {figure.value}
            </Text>
            <Text style={[AppTheme.hint, { fontSize: 11 }]}>{figure.unit}</Text>
          </View>
        ))}
      </View>
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
        {goal.label ?? "Meta con fecha"}: {formatWeight(goal.weightKg, unit, 1)} para el {goal.date}
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
