import { Pressable, Text, View } from "react-native";

import { Card } from "@/src/components/ui";
import { DEFAULT_HABITS } from "@/src/features/habits/habits";
import { AppTheme } from "@/src/theme";

// Hábitos de hoy en el Panel: un toque marca o desmarca cada uno.
export function HabitsQuickCard({
  todayHabit,
  toggleToday,
}: {
  todayHabit: (habitId: string) => boolean;
  toggleToday: (habitId: string) => void;
}) {
  return (
    <Card title="Adherencia de hoy">
      <View style={AppTheme.habitQuickRow}>
        {DEFAULT_HABITS.map((habit) => (
          <Pressable
            key={habit.id}
            onPress={() => toggleToday(habit.id)}
            style={[
              AppTheme.habitQuick,
              todayHabit(habit.id) && { backgroundColor: habit.color, borderColor: habit.color },
            ]}
          >
            <Text style={[AppTheme.habitQuickText, todayHabit(habit.id) && { color: "#FFFFFF" }]}>
              {habit.shortLabel}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={AppTheme.hint}>Marca lo que ya hiciste. El historial mensual vive en Hábitos.</Text>
    </Card>
  );
}
