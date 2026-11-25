import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "@/src/components/Text";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/src/components/PressableScale";
import { Card } from "@/src/components/ui";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { targetsForWeekday } from "@/src/features/profile/targets";
import { WEEK_DAYS } from "@/src/features/training/training.plans";
import { getRoutine } from "@/src/features/training/training.repository";
import { weekdayOf, WEEKDAYS } from "@/src/features/reminders/reminders";
import { AppTheme, RADIUS } from "@/src/theme";

const BAR_HEIGHT = 104;
const BAR_WIDTH = 30;

/**
 * Tu semana: una columna por día partida en grasas, carbohidratos y proteína. Se toca
 * un día y abajo salen sus gramos. Los días de entreno llevan su ícono.
 */
export function DistributionCard({ profile }: { profile: NutritionProfile }) {
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>(weekdayOf(new Date()));
  useEffect(() => {
    getRoutine().then((routine) => setTrainingDays(routine.days));
  }, []);
  const days = WEEK_DAYS.map((day) => ({
    ...day,
    targets: targetsForWeekday(profile, day.id, trainingDays),
  }));
  const uniform = days.every((day) => day.targets.calories === days[0].targets.calories);
  const top = Math.max(...days.map((day) => day.targets.calories), profile.calorieTarget, 1);
  const { colors } = AppTheme;
  const partsOf = ({ protein, carbs, fats }: (typeof days)[number]["targets"]) => [
    { label: "Grasas", grams: fats, kcal: fats * 9, color: colors.fats },
    { label: "Carbos", grams: carbs, kcal: carbs * 4, color: colors.carbs },
    { label: "Proteína", grams: protein, kcal: protein * 4, color: colors.protein },
  ];
  const current = days.find((day) => day.id === selected) ?? days[0];

  return (
    <Card title="Tu semana">
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {days.map((day, index) => {
          const { protein, carbs, fats, calories } = day.targets;
          const height = (calories / top) * BAR_HEIGHT;
          const active = day.id === current.id;
          const training = trainingDays.includes(day.id);
          return (
            <PressableScale
              key={day.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${day.label}: ${calories} kcal, ${protein} g de proteína, ${carbs} g de carbohidratos, ${fats} g de grasas${training ? ", día de entreno" : ""}`}
              onPress={() => setSelected(day.id)}
              style={{
                flex: 1,
                alignItems: "center",
                gap: 6,
                paddingVertical: 8,
                borderRadius: RADIUS.control,
                backgroundColor: active ? colors.surface2 : "transparent",
              }}
            >
              <GrowColumn height={height} delay={index * 50}>
                {partsOf(day.targets).map((part, position) => (
                  <View
                    key={part.label}
                    style={{
                      flex: Math.max(1, part.kcal),
                      backgroundColor: part.color,
                      borderTopWidth: position > 0 ? 2 : 0,
                      borderTopColor: active ? colors.surface2 : colors.surface,
                    }}
                  />
                ))}
              </GrowColumn>
              <Text style={[AppTheme.label, { color: active ? colors.text : colors.muted }]}>
                {day.label}
              </Text>
              <Ionicons name="barbell-outline" size={13} color={training ? colors.accent : "transparent"} />
            </PressableScale>
          );
        })}
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 10 }}>
        <View style={[AppTheme.sectionHeader, { alignItems: "baseline" }]}>
          <Text style={AppTheme.tileTitle}>
            {WEEKDAYS.find((day) => day.id === current.id)?.label ?? current.label}
          </Text>
          <Text style={AppTheme.tileValue}>
            {current.targets.calories}
            <Text style={AppTheme.tileUnit}> kcal</Text>
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {partsOf(current.targets)
            .reverse()
            .map((part) => (
              <View key={part.label} style={{ flex: 1, gap: 2 }}>
                <View style={[AppTheme.legendRow, { gap: 6 }]}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: part.color }} />
                  <Text style={AppTheme.tileSubtitle}>{part.label}</Text>
                </View>
                <Text style={AppTheme.legendValue}>{part.grams} g</Text>
              </View>
            ))}
        </View>
      </View>
      <Text style={AppTheme.hint}>
        {uniform
          ? "Mismo objetivo todos los días, entrenes o no."
          : `Promedio de ${profile.calorieTarget} kcal al día.`}
      </Text>
    </Card>
  );
}

/** Columna que crece desde abajo al aparecer, una tras otra. */
function GrowColumn({
  height,
  delay,
  children,
}: {
  height: number;
  delay: number;
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
      style={[{ width: BAR_WIDTH, borderRadius: 10, overflow: "hidden", justifyContent: "flex-end" }, style]}
    >
      <View style={{ height }}>{children}</View>
    </Animated.View>
  );
}
