import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Card, ListRow, Metric, Screen } from "@/src/components/ui";
import { getBiometricsWindow, type DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { analyzeMetabolism, weeklyRecommendation } from "@/src/features/tdee/tdee";
import { trendColumns } from "@/src/features/tdee/trendChart";
import { goalLabels, weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { CompositionCard } from "@/src/features/dashboard/ProgressSections";
import { ReviewHistoryCard } from "@/src/features/reviews/CheckInSections";
import type { WeeklyReview } from "@/src/features/reviews/reviews";
import { getWeeklyReviews } from "@/src/features/reviews/reviews.repository";
import { convertWeight, formatWeight } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

export default function AnalysisScreen() {
  const [records, setRecords] = useState<DailyBiometrics[]>([]);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const load = useCallback(() => {
    Promise.all([getBiometricsWindow(42), getNutritionProfile(), getWeeklyReviews()]).then(
      ([rows, savedProfile, savedReviews]) => {
        setRecords(rows);
        setProfile(savedProfile);
        setReviews(savedReviews);
      },
    );
  }, []);
  useFocusEffect(load);
  const unit = weightUnitOf(profile);
  const analysis = analyzeMetabolism(records);
  const points = analysis.points.slice(-14);
  const columns = trendColumns(points);
  const calorieTarget = profile?.calorieTarget ?? 1;
  const intakeDays = [...records].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const averageIntake = intakeDays.length
    ? Math.round(intakeDays.reduce((sum, record) => sum + record.caloriesIn, 0) / intakeDays.length)
    : 0;
  const averageProtein = intakeDays.length
    ? Math.round(intakeDays.reduce((sum, record) => sum + record.proteinG, 0) / intakeDays.length)
    : 0;
  const targetHitDays = intakeDays.filter(
    (record) => record.caloriesIn > 0 && Math.abs(record.caloriesIn - calorieTarget) <= calorieTarget * 0.1,
  ).length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>ANÁLISIS</Text>
        <Text style={AppTheme.title}>La señal sobre el ruido.</Text>
        <View style={AppTheme.metricGrid}>
          <Metric label="Días con ingesta" value={String(analysis.loggedDays)} />
          <Metric label="Media kcal · 7d" value={averageIntake ? String(averageIntake) : "—"} />
          <Metric label="Proteína · 7d" value={averageProtein ? `${averageProtein} g` : "—"} />
          <Metric label="Dentro de meta" value={`${targetHitDays}/7`} />
        </View>
        <Card title="Peso tendencia · 14 registros">
          {points.length >= 2 ? (
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
                <Text style={AppTheme.hint}>{points.at(-1)?.date.slice(5)}</Text>
              </View>
              <Text style={AppTheme.hint}>Barra: tu tendencia. Punto: el pesaje de ese día.</Text>
              <Text style={AppTheme.body}>
                Tendencia actual: {formatWeight(points.at(-1)?.trendKg ?? 0, unit, 1)} · Peso registrado:{" "}
                {formatWeight(points.at(-1)?.weightKg ?? 0, unit, 1)}
              </Text>
            </>
          ) : (
            <Text style={AppTheme.body}>Añade al menos dos pesajes para empezar a ver la tendencia.</Text>
          )}
        </Card>
        <Card title="Ingesta · últimos 7 días">
          {intakeDays.length ? (
            <View style={AppTheme.intakeBars}>
              {intakeDays.map((record) => (
                <View key={record.id} style={AppTheme.intakeRow}>
                  <Text style={AppTheme.intakeLabel}>{record.date.slice(5)}</Text>
                  <View style={AppTheme.intakeTrack}>
                    <View
                      style={[
                        AppTheme.intakeFill,
                        { width: `${Math.min(100, (record.caloriesIn / calorieTarget) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={AppTheme.intakeValue}>{record.caloriesIn}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={AppTheme.body}>Los totales diarios aparecerán aquí cuando los registres.</Text>
          )}
        </Card>
        <Card title="Lectura rápida">
          <ListRow
            title="Adherencia calórica"
            detail="Días dentro de ±10% de la meta"
            value={`${targetHitDays} de ${intakeDays.length || 7}`}
          />
          <ListRow
            title="Promedio de proteína"
            detail={
              profile ? `Objetivo: ${profile.proteinTarget} g diarios` : "Configura un objetivo nutricional"
            }
            value={averageProtein ? `${averageProtein} g` : "—"}
          />
          <ListRow
            title="Calorías medias"
            detail={profile ? `Meta: ${profile.calorieTarget} kcal` : "Sin objetivo configurado"}
            value={averageIntake ? `${averageIntake} kcal` : "—"}
          />
        </Card>
        <Card title="Revisión semanal">
          <ListRow
            title="TDEE dinámico"
            detail={`Días de ingesta válidos: ${analysis.loggedDays}`}
            value={analysis.tdee ? `${analysis.tdee} kcal` : "En espera"}
          />
          <ListRow
            title="Cambio de tendencia"
            detail="Basado en peso suavizado"
            value={
              analysis.weeklyRateKg === null
                ? "En espera"
                : `${analysis.weeklyRateKg >= 0 ? "+" : ""}${convertWeight(analysis.weeklyRateKg, "kg", unit).toFixed(2)} ${unit}/sem`
            }
          />
          <Text style={AppTheme.body}>
            {profile
              ? weeklyRecommendation(
                  analysis,
                  profile.goal,
                  points.at(-1)?.trendKg ?? records.find((record) => record.weightKg)?.weightKg ?? 0,
                  unit,
                )
              : "Configura tu plan para recibir una recomendación semanal."}
          </Text>
          {profile ? (
            <Text style={AppTheme.hint}>
              Objetivo actual: {goalLabels[profile.goal]}. Las sugerencias cambian como máximo 100 kcal por
              revisión.
            </Text>
          ) : null}
        </Card>
        {profile ? <CompositionCard records={records} profile={profile} /> : null}
        <ReviewHistoryCard reviews={reviews} />
      </ScrollView>
    </Screen>
  );
}
