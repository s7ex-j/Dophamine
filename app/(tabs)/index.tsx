import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { IconButton, Screen } from "@/src/components/ui";
import { ViewerBanner, ViewerEmpty } from "@/src/features/backup/ViewerSections";
import { buildWeek } from "@/src/features/dashboard/dashboard";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { HabitsQuickCard } from "@/src/features/dashboard/DashboardSections";
import {
  moveSection,
  normalizeLayout,
  toggleSection,
  type PanelLayout,
  type PanelSection,
} from "@/src/features/dashboard/layout";
import {
  BalanceTile,
  CompositionTile,
  CustomizePanel,
  ExpenditureTile,
  FoodSearchBar,
  GoalTile,
  NutritionWeek,
  TrendTile,
} from "@/src/features/dashboard/PanelSections";
import { DEFAULT_HABITS, dateKey } from "@/src/features/habits/habits";
import { getHabitEntries, toggleHabit, type HabitEntry } from "@/src/features/habits/habits.repository";
import { Onboarding } from "@/src/features/profile/PlanWizard";
import { AutoAdjustBanner, CheckInCard } from "@/src/features/reviews/CheckInSections";
import { useCheckIn } from "@/src/features/reviews/useCheckIn";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const LAYOUT_KEY = "dashboard_layout";
// Estas secciones son tarjetas pequeñas: las seguidas se acomodan de a dos por fila.
const TILES: PanelSection[] = ["expenditure", "trend", "balance", "goal"];

// Pestaña "Panel": el progreso de un vistazo, en el orden que elija la persona.
export default function DashboardScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [layout, setLayout] = useState<PanelLayout>(normalizeLayout(null));
  const [customizing, setCustomizing] = useState(false);

  const load = useCallback(() => {
    Promise.all([getDashboardSnapshot(), getHabitEntries(DEFAULT_HABITS, 31), getSetting(LAYOUT_KEY)]).then(
      ([nextSnapshot, nextEntries, savedLayout]) => {
        setSnapshot(nextSnapshot);
        setEntries(nextEntries);
        setLayout(normalizeLayout(savedLayout));
      },
    );
  }, []);
  useEffect(load, [load]);
  useFocusEffect(load);
  const controls = useCheckIn(snapshot, load);

  const changeLayout = (next: PanelLayout) => {
    setLayout(next);
    void setSetting(LAYOUT_KEY, next);
  };
  const todayHabit = (habitId: string) =>
    entries.find((entry) => entry.id === habitId && entry.date === dateKey())?.completed ?? false;
  const toggleToday = async (habitId: string) => {
    await toggleHabit(habitId);
    load();
  };

  if (!snapshot) return <Screen />;
  if (!snapshot.profile)
    return VIEWER ? (
      <ViewerEmpty onLoaded={load} />
    ) : (
      <Onboarding profile={null} weightKg={snapshot.weightKg} onSaved={load} />
    );

  const profile = snapshot.profile;
  const week = buildWeek(snapshot.records);
  const openAnalysis = () => router.push("/analysis");

  const render = (id: PanelSection) => {
    switch (id) {
      case "nutrition":
        return <NutritionWeek key={id} week={week} profile={profile} />;
      case "expenditure":
        return (
          <ExpenditureTile
            key={id}
            records={snapshot.records}
            analysis={snapshot.analysis}
            onPress={openAnalysis}
          />
        );
      case "trend":
        return <TrendTile key={id} analysis={snapshot.analysis} profile={profile} onPress={openAnalysis} />;
      case "balance":
        return (
          <BalanceTile
            key={id}
            records={snapshot.records}
            analysis={snapshot.analysis}
            onPress={openAnalysis}
          />
        );
      case "goal":
        return (
          <GoalTile
            key={id}
            profile={profile}
            trendKg={snapshot.trendKg}
            analysis={snapshot.analysis}
            onPress={() => router.push("/strategy")}
          />
        );
      case "composition":
        return (
          <CompositionTile key={id} records={snapshot.records} profile={profile} onPress={openAnalysis} />
        );
      case "habits":
        return VIEWER ? null : <HabitsQuickCard key={id} todayHabit={todayHabit} toggleToday={toggleToday} />;
    }
  };
  // Agrupa las tarjetas pequeñas seguidas en una misma cuadrícula, respetando el orden.
  const blocks: PanelSection[][] = [];
  for (const item of layout.filter((section) => section.visible)) {
    const last = blocks.at(-1);
    if (TILES.includes(item.id) && last && TILES.includes(last[0])) last.push(item.id);
    else blocks.push([item.id]);
  }
  const today = new Date()
    .toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <View style={AppTheme.sectionHeader}>
          <View>
            <Text style={AppTheme.eyebrow}>{today}</Text>
            <Text style={AppTheme.title}>Panel</Text>
          </View>
          {VIEWER ? null : (
            <IconButton
              icon={customizing ? "checkmark" : "options-outline"}
              label="Personalizar el Panel"
              onPress={() => setCustomizing(!customizing)}
            />
          )}
        </View>
        {VIEWER ? <ViewerBanner /> : <FoodSearchBar onPress={() => router.push("/add-food")} />}
        <AutoAdjustBanner snapshot={snapshot} controls={controls} />
        {controls.action === "propose" ? <CheckInCard snapshot={snapshot} controls={controls} /> : null}
        {customizing ? (
          <CustomizePanel
            layout={layout}
            onMove={(id, delta) => changeLayout(moveSection(layout, id, delta))}
            onToggle={(id) => changeLayout(toggleSection(layout, id))}
            onDone={() => setCustomizing(false)}
          />
        ) : null}
        {blocks.map((block) =>
          TILES.includes(block[0]) ? (
            <View key={block.join("-")} style={AppTheme.tileGrid}>
              {block.map(render)}
            </View>
          ) : (
            render(block[0])
          ),
        )}
      </ScrollView>
    </Screen>
  );
}
