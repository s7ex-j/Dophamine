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
  goalProgress,
  targetWeeklyRateKg,
  weightUnitOf,
  type NutritionProfile,
} from "@/src/features/profile/profile";
import type { MetabolicAnalysis } from "@/src/features/tdee/tdee";
import { trendColumns } from "@/src/features/tdee/trendChart";
import { convertWeight, formatWeight } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

// Tarjetas de progreso: meta de peso, tendencia, gasto y composición corporal.
// Reciben los datos ya cargados; los cálculos están en el dominio.

export function GoalProgressCard({
  profile,
  trendKg,
}: {
  profile: NutritionProfile;
  trendKg: number | null;
}) {
  const progress = goalProgress(profile, trendKg);
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
      <View style={AppTheme.goalEnds}>
        <Text style={AppTheme.hint}>Inicio {formatWeight(progress.startKg, unit, 1)}</Text>
        <Text style={AppTheme.hint}>Tendencia {formatWeight(progress.currentKg, unit, 1)}</Text>
        <Text style={AppTheme.hint}>Meta {formatWeight(progress.goalKg, unit, 1)}</Text>
      </View>
    </Card>
  );
}

export function TrendCard({ analysis, profile }: { analysis: MetabolicAnalysis; profile: NutritionProfile }) {
  const unit = weightUnitOf(profile);
  const points = analysis.points.slice(-14);
  const columns = trendColumns(points);
  const last = points.at(-1);
  const target = last ? targetWeeklyRateKg(profile, last.trendKg) : null;
  const rate = (kg: number) =>
    `${kg > 0 ? "+" : kg < 0 ? "−" : ""}${Math.abs(convertWeight(kg, "kg", unit)).toFixed(2)} ${unit}/sem`;
  return (
    <Card title="Tendencia de peso">
      {points.length >= 2 && last ? (
        <>
          <View style={AppTheme.chart}>
            <View style={AppTheme.chartBars}>
              {columns.map((column) => (
                <View key={column.date} style={AppTheme.chartColumn}>
                  <View style={[AppTheme.chartBar, { height: `${column.trendPct}%` }]} />
                  <View style={[AppTheme.chartDot, { bottom: `${column.weightPct}%` }]} />
                </View>
              ))}
            </View>
          </View>
          <View style={AppTheme.chartLabels}>
            <Text style={AppTheme.hint}>{points[0].date.slice(5)}</Text>
            <Text style={AppTheme.hint}>{last.date.slice(5)}</Text>
          </View>
          <ListRow
            title="Tendencia"
            detail={`Pesaje más reciente: ${formatWeight(last.weightKg, unit, 1)}`}
            value={formatWeight(last.trendKg, unit, 1)}
          />
          <ListRow
            title="Ritmo real"
            detail={target === null ? "Últimas semanas" : `Meta: ${rate(target)}`}
            value={analysis.weeklyRateKg === null ? "En espera" : rate(analysis.weeklyRateKg)}
          />
          <Text style={AppTheme.hint}>Barra: tu tendencia. Punto: el pesaje de ese día.</Text>
        </>
      ) : (
        <Text style={AppTheme.body}>Registra tu peso al menos dos días para ver la tendencia.</Text>
      )}
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
