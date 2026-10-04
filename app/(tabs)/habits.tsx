import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Card, Screen } from "@/src/components/ui";
import { DEFAULT_HABITS, monthDays } from "@/src/features/habits/habits";
import { getHabitEntries, toggleHabit, type HabitEntry } from "@/src/features/habits/habits.repository";
import { AppTheme } from "@/src/theme";

const MONTH_NAME = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" });

export default function HabitsScreen() {
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const days = useMemo(() => monthDays(), []);
  const load = useCallback(() => { getHabitEntries(DEFAULT_HABITS, days.length).then(setEntries); }, [days.length]);
  useFocusEffect(load);
  const completed = (habitId: string, date: string) => entries.find((entry) => entry.id === habitId && entry.date === date)?.completed ?? false;
  const toggle = async (habitId: string, date: string) => { await toggleHabit(habitId, date); load(); };
  const total = entries.filter((entry) => entry.completed).length;
  const available = days.length * DEFAULT_HABITS.length;

  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.eyebrow}>CONSISTENCIA, NO PERFECCIÓN</Text><Text style={AppTheme.title}>Hábitos</Text>
    <Card title={MONTH_NAME.format(new Date())}><Text style={AppTheme.body}>{total} marcas de {available} posibles · {available ? Math.round((total / available) * 100) : 0}% de consistencia mensual</Text><View style={AppTheme.progressTrack}><View style={[AppTheme.progressFill, { width: `${available ? (total / available) * 100 : 0}%` }]} /></View></Card>
    <Card title="Vista mensual"><Text style={AppTheme.hint}>Toca una casilla para marcar o desmarcar el hábito de ese día.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={AppTheme.habitGrid}>
        <View style={AppTheme.habitHeader}><Text style={AppTheme.habitLabel}>Hábito</Text>{days.map((date) => <Text key={date} style={AppTheme.habitDay}>{Number(date.slice(-2))}</Text>)}</View>
        {DEFAULT_HABITS.map((habit) => <View key={habit.id} style={AppTheme.habitRow}><View style={AppTheme.habitName}><View style={[AppTheme.habitColor, { backgroundColor: habit.color }]} /><Text style={AppTheme.habitLabel}>{habit.shortLabel}</Text></View>{days.map((date) => <Pressable key={date} accessibilityLabel={`${habit.label} ${date}`} onPress={() => toggle(habit.id, date)} style={[AppTheme.habitCell, completed(habit.id, date) && { backgroundColor: habit.color, borderColor: habit.color }]}><Text style={[AppTheme.habitCellText, completed(habit.id, date) && AppTheme.habitCellTextActive]}>{completed(habit.id, date) ? "✓" : ""}</Text></Pressable>)}</View>)}
      </View></ScrollView>
    </Card>
    <Card title="Qué cuenta hoy">{DEFAULT_HABITS.map((habit) => { const count = entries.filter((entry) => entry.id === habit.id && entry.completed).length; return <View key={habit.id} style={AppTheme.habitSummary}><View style={[AppTheme.habitColor, { backgroundColor: habit.color }]} /><Text style={AppTheme.listText}>{habit.label}</Text><Text style={AppTheme.listValue}>{count}/{days.length}</Text></View>; })}</Card>
  </ScrollView></Screen>;
}
