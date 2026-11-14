import { Text, View } from "react-native";

import { Card, ListRow, Metric } from "@/src/components/ui";
import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import {
  compositionChange,
  compositionSeries,
  describeCompositionChange,
  fatFreeMassIndex,
  latestComposition,
} from "@/src/features/composition/composition";
import {
  goalEta,
  goalProgress,
  targetWeeklyRateKg,
  weightUnitOf,
  type NutritionProfile,
} from "@/src/features/profile/profile";
import type { MetabolicAnalysis } from "@/src/features/tdee/tdee";
import { convertWeight, formatWeight } from "@/src/lib/units";
import { localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

// Tarjetas de progreso: meta de peso, tendencia, gasto y composición corporal.
// Reciben los datos ya cargados; los cálculos están en el dominio.

export function GoalProgressCard({
  profile,
  trendKg,
  weeklyRateKg = null,
}: {
  profile: NutritionProfile;
  trendKg: number | null;
  /** Ritmo real (pendiente de la tendencia), para estimar la llegada a ese ritmo. */
  weeklyRateKg?: number | null;
}) {
  const progress = goalProgress(profile, trendKg);
  const eta = progress ? goalEta(progress, weeklyRateKg, localDateKey()) : null;
  const unit = weightUnitOf(profile);
  if (!progress) return null;
  return (
    <Card title="Progreso hacia tu meta">
      <View style={AppTheme.energyTop}>
        <View>
          <Text style={AppTheme.energyNumber}>{progress.percent}%</Text>
          <Text style={AppTheme.hint}>
            {progress.reached
              ? "Llegaste a tu peso meta."
              : `Faltan ${formatWeight(progress.remainingKg, unit, 1)}${
                  progress.weeksLeft ? ` · unas ${progress.weeksLeft} semanas a tu ritmo` : ""
                }`}
          </Text>
        </View>
      </View>
      <View style={AppTheme.goalTrack}>
        <View style={[AppTheme.goalFill, { width: `${progress.percent}%` }]} />
      </View>
      {eta ? (
        <Text style={AppTheme.body}>
          {eta.direction === "toward"
            ? `Al ritmo real de tus últimas semanas llegarías hacia el ${eta.actualDate} (~${eta.actualWeeks} semanas).`
            : eta.direction === "away"
              ? "Al ritmo real de tus últimas semanas te estás alejando de la meta: revisa tu plan o tu registro."
              : "Tu peso está casi estable: a este ritmo no hay fecha estimada."}
        </Text>
      ) : null}
      <View style={AppTheme.goalEnds}>
        <Text style={AppTheme.hint}>Inicio {formatWeight(progress.startKg, unit, 1)}</Text>
        <Text style={AppTheme.hint}>Tendencia {formatWeight(progress.currentKg, unit, 1)}</Text>
        <Text style={AppTheme.hint}>Meta {formatWeight(progress.goalKg, unit, 1)}</Text>
      </View>
    </Card>
  );
}

export function ExpenditureCard({ analysis }: { analysis: MetabolicAnalysis }) {
  return (
    <Card title="Gasto energético">
      <ListRow
        title="Gasto estimado (TDEE)"
        detail={
          analysis.tdee
            ? "Calculado con tu ingesta y tu tendencia de peso. Es una estimación."
            : `Se activa con 14 días de tendencia y 10 de ingesta. Llevas ${analysis.loggedDays} de ingesta.`
        }
        value={analysis.tdee ? `${analysis.tdee} kcal` : "En espera"}
      />
      <ListRow
        title="Calidad de los datos"
        detail="Últimos 7 días"
        value={`${analysis.nutritionDaysLast7}/7 · ${analysis.weightDaysLast7}/7`}
      />
    </Card>
  );
}

export function CompositionCard({
  records,
  profile,
}: {
  records: DailyBiometrics[];
  profile: NutritionProfile;
}) {
  const unit = weightUnitOf(profile);
  const latest = latestComposition(records);
  const current = compositionSeries(records).at(-1);
  const change = compositionChange(records);
  const hasAny = Object.values(latest).some((value) => value !== null);
  return (
    <Card title="Composición corporal">
      {hasAny ? (
        <>
          <View style={AppTheme.metricGrid}>
            <Metric label="Grasa corporal" value={latest.bodyFatPct ? `${latest.bodyFatPct} %` : "—"} />
            <Metric label="Masa magra" value={current ? formatWeight(current.leanMassKg, unit, 1) : "—"} />
            <Metric
              label="Masa muscular"
              value={latest.muscleMassKg ? formatWeight(latest.muscleMassKg, unit, 1) : "—"}
            />
            <Metric
              label="Masa ósea"
              value={latest.boneMassKg ? formatWeight(latest.boneMassKg, unit, 1) : "—"}
            />
            <Metric label="Agua" value={latest.waterPct ? `${latest.waterPct} %` : "—"} />
            <Metric
              label="Índice de masa magra"
              value={current ? String(fatFreeMassIndex(current.leanMassKg, profile.heightCm)) : "—"}
            />
          </View>
          <Text style={AppTheme.body}>
            {change
              ? describeCompositionChange(change, profile.goal)
              : "Con 3 mediciones de % de grasa en al menos 7 días verás cuánto de tu cambio es grasa y cuánto masa magra."}
          </Text>
          <Text style={AppTheme.hint}>
            Las balanzas de bioimpedancia varían con la hidratación: mídete siempre a la misma hora y mira la
            tendencia, no un día suelto.
          </Text>
        </>
      ) : (
        <Text style={AppTheme.body}>
          Si tienes una balanza que mide grasa, músculo, agua o masa ósea, anótalos al registrar tu peso para
          separar grasa de masa magra en tu progreso.
        </Text>
      )}
    </Card>
  );
}
