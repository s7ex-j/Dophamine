import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Card } from "@/src/components/ui";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { targetsForWeekday } from "@/src/features/profile/targets";
import { WEEK_DAYS } from "@/src/features/training/training.plans";
import { getRoutine } from "@/src/features/training/training.repository";
import { AppTheme } from "@/src/theme";

const BAR_HEIGHT = 150;
const BAR_WIDTH = 14;

/**
 * Tu semana: cómo se reparten las calorías día a día, con una barra por día
 * partida en proteína, carbohidratos y grasas. Cambiar el reparto no mueve el
 * promedio: la revisión sigue ajustando el objetivo de siempre.
 */
export function DistributionCard({ profile }: { profile: NutritionProfile }) {
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  useEffect(() => {
    getRoutine().then((routine) => setTrainingDays(routine.days));
  }, []);
  const days = WEEK_DAYS.map((day) => ({
    ...day,
    targets: targetsForWeekday(profile, day.id, trainingDays),
  }));
  const uniform = days.every((day) => day.targets.calories === days[0].targets.calories);
  const top = Math.max(...days.map((day) => day.targets.calories), profile.calorieTarget, 1);

  return (
    <Card title={uniform ? `Tu semana · ${days[0].targets.calories} kcal al día` : "Tu semana"}>
      <View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: BAR_HEIGHT + 18 }}>
          {days.map((day) => {
            const { protein, carbs, fats, calories } = day.targets;
            const parts = [
              { kcal: fats * 9, color: AppTheme.colors.fats },
              { kcal: carbs * 4, color: AppTheme.colors.carbs },
              { kcal: protein * 4, color: AppTheme.colors.protein },
            ];
            const sum = parts.reduce((total, part) => total + part.kcal, 0) || 1;
            return (
              <View key={day.id} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                {uniform ? null : (
                  <Text style={[AppTheme.hint, { fontSize: 10, lineHeight: 12 }]}>{calories}</Text>
                )}
                <View
                  accessibilityLabel={`${day.label}: ${calories} kcal, ${protein} g de proteína, ${carbs} g de carbohidratos, ${fats} g de grasas`}
                  style={{
                    width: BAR_WIDTH,
                    height: (calories / top) * BAR_HEIGHT,
                    borderRadius: BAR_WIDTH / 2,
                    overflow: "hidden",
                  }}
                >
                  {parts.map((part, index) => (
                    <View key={index} style={{ flex: part.kcal / sum, backgroundColor: part.color }} />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
        {/* Línea del promedio de la semana (tu objetivo). */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: (profile.calorieTarget / top) * BAR_HEIGHT,
            borderTopWidth: 1,
            borderStyle: "dashed",
            borderTopColor: AppTheme.colors.muted,
          }}
        />
      </View>
      <View style={{ gap: 3 }}>
        <View style={{ flexDirection: "row" }}>
          {days.map((day) => (
            <Text
              key={day.id}
              style={[
                AppTheme.label,
                { flex: 1, textAlign: "center" },
                trainingDays.includes(day.id) && { color: AppTheme.colors.accent },
              ]}
            >
              {day.label}
            </Text>
          ))}
        </View>
        {(
          [
            ["protein", AppTheme.colors.protein],
            ["carbs", AppTheme.colors.carbs],
            ["fats", AppTheme.colors.fats],
          ] as const
        ).map(([key, color]) => (
          <View key={key} style={{ flexDirection: "row" }}>
            {days.map((day) => (
              <Text
                key={day.id}
                style={{ flex: 1, textAlign: "center", fontSize: 11, color, fontWeight: "600" }}
              >
                {day.targets[key]}
              </Text>
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 14 }}>
        {(
          [
            ["Proteína (g)", AppTheme.colors.protein],
            ["Carbohidratos (g)", AppTheme.colors.carbs],
            ["Grasas (g)", AppTheme.colors.fats],
          ] as const
        ).map(([label, color]) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
            <Text style={AppTheme.hint}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={AppTheme.hint}>
        Mismo objetivo todos los días, entrenes o no. La línea marca tu promedio; la revisión lo ajusta.
      </Text>
    </Card>
  );
}
