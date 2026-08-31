import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Card, ListRow, Screen } from "@/src/components/ui";
import { getBiometricsWindow, type DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { analyzeMetabolism, weeklyRecommendation } from "@/src/features/tdee/tdee";
import { goalLabels, type NutritionProfile } from "@/src/features/profile/profile";
import { AppTheme } from "@/src/theme";

export default function AnalysisScreen() {
  const [records, setRecords] = useState<DailyBiometrics[]>([]);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const load = useCallback(() => { Promise.all([getBiometricsWindow(42), getNutritionProfile()]).then(([rows, savedProfile]) => { setRecords(rows); setProfile(savedProfile); }); }, []);
  useFocusEffect(load);
  const analysis = analyzeMetabolism(records);
  const points = analysis.points.slice(-14);
  const minTrend = Math.min(...points.map((point) => point.trendKg), 0);
  const maxTrend = Math.max(...points.map((point) => point.trendKg), 1);
  const calorieTarget = profile?.calorieTarget ?? 1;
  const intakeDays = [...records].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.eyebrow}>ANÁLISIS</Text><Text style={AppTheme.title}>La señal sobre el ruido.</Text>
    <Card title="Peso tendencia · 14 registros">
      {points.length >= 2 ? <><View style={AppTheme.chart}><View style={AppTheme.chartBars}>{points.map((point) => <View key={point.date} style={AppTheme.chartColumn}><View style={[AppTheme.chartBar, { height: `${Math.max(12, ((point.trendKg - minTrend) / Math.max(0.1, maxTrend - minTrend)) * 100)}%` }]} /></View>)}</View></View><View style={AppTheme.chartLabels}><Text style={AppTheme.hint}>{points[0].date.slice(5)}</Text><Text style={AppTheme.hint}>{points.at(-1)?.date.slice(5)}</Text></View><Text style={AppTheme.body}>Tendencia actual: {points.at(-1)?.trendKg.toFixed(1)} kg · Peso registrado: {points.at(-1)?.weightKg.toFixed(1)} kg</Text></> : <Text style={AppTheme.body}>Añade al menos dos pesajes para empezar a ver la tendencia.</Text>}
    </Card>
    <Card title="Ingesta · últimos 7 días">
      {intakeDays.length ? <View style={AppTheme.intakeBars}>{intakeDays.map((record) => <View key={record.id} style={AppTheme.intakeRow}><Text style={AppTheme.intakeLabel}>{record.date.slice(5)}</Text><View style={AppTheme.intakeTrack}><View style={[AppTheme.intakeFill, { width: `${Math.min(100, record.caloriesIn / calorieTarget * 100)}%` }]} /></View><Text style={AppTheme.intakeValue}>{record.caloriesIn}</Text></View>)}</View> : <Text style={AppTheme.body}>Los totales diarios aparecerán aquí cuando los registres.</Text>}
    </Card>
    <Card title="Revisión semanal">
      <ListRow title="TDEE dinámico" detail={`Días de ingesta válidos: ${analysis.loggedDays}`} value={analysis.tdee ? `${analysis.tdee} kcal` : "En espera"} />
      <ListRow title="Cambio de tendencia" detail="Basado en peso suavizado" value={analysis.weeklyRateKg === null ? "En espera" : `${analysis.weeklyRateKg >= 0 ? "+" : ""}${analysis.weeklyRateKg.toFixed(2)} kg/sem`} />
      <Text style={AppTheme.body}>{profile ? weeklyRecommendation(analysis, profile.goal, points.at(-1)?.trendKg ?? records[0]?.weightKg ?? 0) : "Configura tu plan para recibir una recomendación semanal."}</Text>
      {profile ? <Text style={AppTheme.hint}>Objetivo actual: {goalLabels[profile.goal]}. Las sugerencias cambian como máximo 100 kcal por revisión.</Text> : null}
    </Card>
  </ScrollView></Screen>;
}

