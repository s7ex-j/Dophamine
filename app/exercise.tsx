import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";

import { Card, Chips, Screen } from "@/src/components/ui";
import { DetailChart } from "@/src/components/DetailChart";
import {
  alternatives,
  EQUIPMENT_LABELS,
  findExercise,
  MUSCLE_LABELS,
} from "@/src/features/exercises/catalog";
import { weightUnitOf } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { ExerciseImage } from "@/src/features/exercises/ExerciseImage";
import { getSessionHistory } from "@/src/features/training/training.repository";
import { exerciseProgress, type CompletedSession } from "@/src/features/training/workout";
import { localDateKey } from "@/src/lib/dates";
import { convertWeight, formatWeight, type WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

type Metric = "oneRepMax" | "heaviest" | "volume";
const LABELS: Record<Metric, string> = {
  oneRepMax: "1RM estimado",
  heaviest: "Carga máxima",
  volume: "Volumen",
};

// Historial de un ejercicio: su evolución sesión a sesión y sus datos del catálogo.
export default function ExerciseScreen() {
  const params = useLocalSearchParams<{ name?: string }>();
  const name = params.name ?? "";
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [metric, setMetric] = useState<Metric>("oneRepMax");
  useFocusEffect(
    useCallback(() => {
      Promise.all([getSessionHistory(200), getNutritionProfile()]).then(([history, profile]) => {
        setSessions(history);
        setUnit(weightUnitOf(profile));
      });
    }, []),
  );
  const catalog = findExercise(name);
  const progress = exerciseProgress(name, sessions);
  const best = progress.length ? Math.max(...progress.map((item) => item[metric])) : 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: name || "Ejercicio" }} />
      <ScrollView contentContainerStyle={AppTheme.content}>
        {catalog?.media ? (
          <View style={{ alignItems: "center" }}>
            <ExerciseImage media={catalog.media} size={220} animate />
          </View>
        ) : null}
        {catalog ? (
          <Card title="Qué trabaja">
            <Text style={AppTheme.body}>
              Principal: {catalog.primary.map((muscle) => MUSCLE_LABELS[muscle]).join(", ")}
            </Text>
            {catalog.secondary.length ? (
              <Text style={AppTheme.hint}>
                Secundario: {catalog.secondary.map((muscle) => MUSCLE_LABELS[muscle]).join(", ")}
              </Text>
            ) : null}
            <Text style={AppTheme.hint}>
              {EQUIPMENT_LABELS[catalog.equipment]}
              {catalog.unilateral ? " · un lado a la vez" : ""}
            </Text>
          </Card>
        ) : null}
        <Chips
          value={metric}
          onChange={setMetric}
          options={(Object.keys(LABELS) as Metric[]).map((value) => ({ value, label: LABELS[value] }))}
        />
        <View style={AppTheme.card}>
          {progress.length >= 2 ? (
            <DetailChart
              key={metric}
              insight={{
                title: LABELS[metric],
                unit,
                dates: progress.map((item) => localDateKey(new Date(item.completedAt))),
                series: [
                  {
                    label: LABELS[metric],
                    color: metric === "volume" ? "blue" : "accent",
                    kind: metric === "volume" ? "bars" : "line",
                    values: progress.map(
                      (item) => Math.round(convertWeight(item[metric], "kg", unit) * 10) / 10,
                    ),
                  },
                ],
              }}
            />
          ) : (
            <Text style={AppTheme.body}>Con dos sesiones de este ejercicio verás su evolución.</Text>
          )}
        </View>
        <View style={AppTheme.tileGrid}>
          <View style={AppTheme.tile}>
            <Text style={AppTheme.tileSubtitle}>Mejor marca · {LABELS[metric]}</Text>
            <Text style={AppTheme.tileValue}>
              {best ? formatWeight(best, unit, metric === "volume" ? 0 : 1) : "—"}
            </Text>
          </View>
          <View style={AppTheme.tile}>
            <Text style={AppTheme.tileSubtitle}>Sesiones</Text>
            <Text style={AppTheme.tileValue}>{progress.length}</Text>
          </View>
        </View>
        {catalog?.steps?.length ? (
          <Card title="Cómo se hace">
            {catalog.steps.map((step, number) => (
              <Text key={step} style={AppTheme.body}>
                {number + 1}. {step}
              </Text>
            ))}
            <Text style={AppTheme.hint}>Exercise data by RepDB (repdb.co)</Text>
          </Card>
        ) : null}
        {catalog ? (
          <Card title="Reemplazos">
            {alternatives(catalog)
              .slice(0, 6)
              .map((option) => (
                <Text key={option.id} style={AppTheme.body}>
                  {option.name} · {EQUIPMENT_LABELS[option.equipment]}
                </Text>
              ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
