import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";

import { Chips, Screen } from "@/src/components/ui";
import { ConsistencyGrid, DetailChart } from "@/src/components/DetailChart";
import { getBiometricsWindow, type DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import {
  buildInsight,
  INSIGHT_TITLES,
  isInsightMetric,
  RANGE_DAYS,
  type InsightRange,
} from "@/src/features/dashboard/insights";
import { PERIODS_KEY, readPeriods, type Period } from "@/src/features/period/period";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { getSetting } from "@/src/features/settings/settings.repository";
import type { SleepEntry } from "@/src/features/sleep/sleep";
import { getSleepSince } from "@/src/features/sleep/sleep.repository";
import { addDays, localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

// Detalle de una tarjeta del Panel: gráfico con rango de fechas y cifras clave.
export default function InsightScreen() {
  const params = useLocalSearchParams<{ metric?: string }>();
  const metric = isInsightMetric(params.metric) ? params.metric : "weight";
  const [range, setRange] = useState<InsightRange>(metric === "consistency" ? "3M" : "1M");
  const [records, setRecords] = useState<DailyBiometrics[]>([]);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [sleep, setSleep] = useState<SleepEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  useFocusEffect(
    useCallback(() => {
      // Un año más 6 semanas: el gasto de cada día necesita los días anteriores.
      Promise.all([
        getBiometricsWindow(410),
        getNutritionProfile(),
        getSleepSince(addDays(localDateKey(), -366)),
        getSetting(PERIODS_KEY),
      ]).then(([rows, nextProfile, nights, savedPeriods]) => {
        setPeriods(readPeriods(savedPeriods));
        setRecords(rows);
        setProfile(nextProfile);
        setSleep(nights);
      });
    }, []),
  );

  const insight = useMemo(
    () => (profile ? buildInsight(metric, range, { records, profile, sleep, periods }) : null),
    [metric, range, records, profile, sleep, periods],
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: INSIGHT_TITLES[metric] }} />
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Chips
          value={range}
          onChange={setRange}
          options={(Object.keys(RANGE_DAYS) as InsightRange[]).map((value) => ({ value, label: value }))}
        />
        {insight ? (
          <>
            <View style={AppTheme.card}>
              {metric === "consistency" ? (
                <>
                  <ConsistencyGrid levels={insight.series[0].values} dates={insight.dates} />
                  <Text style={AppTheme.hint}>Más intenso: comida y pesaje. Tenue: solo sueño.</Text>
                </>
              ) : insight.empty ? (
                <Text style={AppTheme.body}>{insight.empty}</Text>
              ) : (
                <DetailChart key={range} insight={insight} />
              )}
            </View>
            <View style={AppTheme.tileGrid}>
              {insight.stats.map((stat) => (
                <View key={stat.label} style={AppTheme.tile}>
                  <Text style={AppTheme.tileSubtitle}>{stat.label}</Text>
                  <Text style={AppTheme.tileValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
            {metric === "expenditure" ? (
              <Text style={AppTheme.hint}>
                Es una estimación a partir de lo que comes y de tu tendencia de peso, no una medición.
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={AppTheme.body}>Crea tu plan para ver este análisis.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}
