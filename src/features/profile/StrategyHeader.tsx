import { Text, View } from "react-native";

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
 * ritmo real y margen del gasto.
 */
export function StrategyHeader({
  profile,
  trendKg,
  analysis,
}: {
  profile: NutritionProfile;
  trendKg: number | null;
  analysis: MetabolicAnalysis;
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
        <Text style={AppTheme.eyebrow}>ESTRATEGIA</Text>
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
            <Text style={[AppTheme.hint, { fontSize: 10 }]}>{figure.unit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
