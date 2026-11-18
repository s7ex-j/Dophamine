import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { Card } from "@/src/components/ui";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { targetsForWeekday } from "@/src/features/profile/targets";
import { WEEK_DAYS } from "@/src/features/training/training.plans";
import { getRoutine } from "@/src/features/training/training.repository";
import { AppTheme } from "@/src/theme";

const BAR_HEIGHT = 210;
const BAR_WIDTH = 36;
/** Bajo este alto un tramo no tiene lugar para su número: se deja solo el color. */
const MIN_LABEL = 18;

/**
 * Tu semana: una columna por día partida en grasas, carbohidratos y proteína,
 * con los gramos dentro de cada tramo. Los días de entreno van marcados.
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
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: BAR_HEIGHT + (uniform ? 0 : 16) }}>
        {days.map((day, index) => {
          const { protein, carbs, fats, calories } = day.targets;
          const height = (calories / top) * BAR_HEIGHT;
          const parts = [
            { grams: fats, kcal: fats * 9, color: AppTheme.colors.fats },
            { grams: carbs, kcal: carbs * 4, color: AppTheme.colors.carbs },
            { grams: protein, kcal: protein * 4, color: AppTheme.colors.protein },
          ];
          const sum = parts.reduce((total, part) => total + part.kcal, 0) || 1;
          return (
            <View key={day.id} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              {uniform ? null : (
                <Text style={[AppTheme.hint, { fontSize: 10, lineHeight: 12 }]}>{calories}</Text>
              )}
              <GrowColumn
                height={height}
                delay={index * 50}
                label={`${day.label}: ${calories} kcal, ${protein} g de proteína, ${carbs} g de carbohidratos, ${fats} g de grasas`}
              >
                {parts.map((part, position) => {
                  const share = part.kcal / sum;
                  return (
                    <View
                      key={position}
                      style={{
                        flex: share,
                        backgroundColor: part.color,
                        alignItems: "center",
                        justifyContent: "center",
                        borderTopWidth: position > 0 ? 2 : 0,
                        borderTopColor: AppTheme.colors.surface,
                      }}
                    >
                      {share * height >= MIN_LABEL ? (
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "800",
                            color: AppTheme.colors.onAccent,
                            fontVariant: ["tabular-nums"],
                          }}
                        >
                          {part.grams}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </GrowColumn>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row" }}>
        {days.map((day) => {
          const training = trainingDays.includes(day.id);
          return (
            <View key={day.id} style={{ flex: 1, alignItems: "center", gap: 3 }}>
              <Text style={[AppTheme.label, training && { color: AppTheme.colors.accent }]}>{day.label}</Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: training ? AppTheme.colors.accent : "transparent",
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 14 }}>
        {(
          [
            ["Proteína", AppTheme.colors.protein],
            ["Carbohidratos", AppTheme.colors.carbs],
            ["Grasas", AppTheme.colors.fats],
            ["Entreno", AppTheme.colors.accent],
          ] as const
        ).map(([label, color]) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: label === "Entreno" ? 6 : 10,
                height: label === "Entreno" ? 6 : 10,
                borderRadius: label === "Entreno" ? 3 : 3,
                backgroundColor: color,
              }}
            />
            <Text style={AppTheme.hint}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={AppTheme.hint}>
        Gramos de cada macro por día. Mismo objetivo todos los días, entrenes o no.
      </Text>
    </Card>
  );
}

/** Columna que crece desde abajo al aparecer, una tras otra. */
function GrowColumn({
  height,
  delay,
  label,
  children,
}: {
  height: number;
  delay: number;
  label: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const grown = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion)
      grown.value = withDelay(delay, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [delay, reduceMotion, grown]);
  const style = useAnimatedStyle(() => ({ height: height * grown.value }));
  return (
    <Animated.View
      accessibilityLabel={label}
      style={[{ width: BAR_WIDTH, borderRadius: 10, overflow: "hidden", justifyContent: "flex-end" }, style]}
    >
      <View style={{ height }}>{children}</View>
    </Animated.View>
  );
}
