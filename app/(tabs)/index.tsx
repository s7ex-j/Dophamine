import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { IconButton, Screen } from "@/src/components/ui";
import { ViewerBanner, ViewerEmpty } from "@/src/features/backup/ViewerSections";
import { buildWeek } from "@/src/features/dashboard/dashboard";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import type { InsightMetric } from "@/src/features/dashboard/insights";
import {
  moveSection,
  normalizeLayout,
  toggleSection,
  type PanelLayout,
  type PanelSection,
} from "@/src/features/dashboard/layout";
import {
  BalanceTile,
  ComplianceCard,
  CompositionTile,
  ConsistencyTile,
  CustomizePanel,
  ExpenditureTile,
  FoodSearchBar,
  GoalTile,
  MacrosTile,
  NutritionWeek,
  SleepTile,
  TrendTile,
} from "@/src/features/dashboard/PanelSections";
import type { DayCompliance } from "@/src/features/habits/compliance";
import { getComplianceDays } from "@/src/features/habits/compliance.data";
import { Onboarding } from "@/src/features/profile/PlanWizard";
import { weightUnitOf } from "@/src/features/profile/profile";
import { AutoAdjustBanner, CheckInCard } from "@/src/features/reviews/CheckInSections";
import { useCheckIn } from "@/src/features/reviews/useCheckIn";
import { TodaySection } from "@/src/features/dashboard/TodaySection";
import { StreakCard } from "@/src/features/streak/StreakCard";
import { DopiCheckIn } from "@/src/features/wellbeing/DopiCheckIn";
import { DISMISS_KEY, shouldOfferCheckIn } from "@/src/features/wellbeing/wellbeing";
import { getWellbeingDates } from "@/src/features/wellbeing/wellbeing.repository";
import { WeeklyCard } from "@/src/features/dashboard/WeeklyCard";
import { getWeeklySummary } from "@/src/features/dashboard/weekly.data";
import type { WeeklySummary } from "@/src/features/dashboard/weekly";
import { getStreakSummary, type StreakSummary } from "@/src/features/streak/streak.data";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import type { SleepEntry } from "@/src/features/sleep/sleep";
import { getSleepSince } from "@/src/features/sleep/sleep.repository";
import { addDays, localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const LAYOUT_KEY = "dashboard_layout";
// Estas secciones son tarjetas pequeñas: las seguidas se acomodan de a dos por fila.
const TILES: PanelSection[] = ["expenditure", "trend", "balance", "goal", "macros", "sleep"];

// Pestaña "Panel": el progreso de un vistazo, en el orden que elija la persona.
export default function DashboardScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [compliance, setCompliance] = useState<DayCompliance | null>(null);
  const [sleep, setSleep] = useState<SleepEntry[]>([]);
  const [layout, setLayout] = useState<PanelLayout>(normalizeLayout(null));
  const [customizing, setCustomizing] = useState(false);
  const [streak, setStreak] = useState<StreakSummary | null>(null);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [offerCheckIn, setOfferCheckIn] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      getDashboardSnapshot(),
      getComplianceDays(1),
      getSleepSince(addDays(localDateKey(), -40)),
      getSetting(LAYOUT_KEY),
      getStreakSummary(),
      getWeeklySummary(),
      getWellbeingDates(localDateKey()),
      getSetting(DISMISS_KEY),
    ]).then(([nextSnapshot, days, nights, savedLayout, nextStreak, nextWeekly, checked, dismissed]) => {
      setOfferCheckIn(shouldOfferCheckIn(localDateKey(), checked.includes(localDateKey()), dismissed));
      setStreak(nextStreak);
      setWeekly(nextWeekly);
      setSnapshot(nextSnapshot);
      setCompliance(days[0]?.compliance ?? null);
      setSleep(nights);
      setLayout(normalizeLayout(savedLayout));
    });
  }, []);
  useEffect(load, [load]);
  useFocusEffect(load);
  const controls = useCheckIn(snapshot, load);

  const changeLayout = (next: PanelLayout) => {
    setLayout(next);
    void setSetting(LAYOUT_KEY, next);
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
  const today = localDateKey();
  const lastDays = (count: number) =>
    Array.from({ length: count }, (_, index) => addDays(today, index - count + 1));
  const open = (metric: InsightMetric) => () => router.push({ pathname: "/insight", params: { metric } });

  const render = (id: PanelSection) => {
    switch (id) {
      case "nutrition":
        return <NutritionWeek key={id} week={week} profile={profile} />;
      case "habits":
        return compliance && !VIEWER ? (
          <ComplianceCard key={id} compliance={compliance} onPress={() => router.push("/habits")} />
        ) : null;
      case "expenditure":
        return (
          <ExpenditureTile
            key={id}
            records={snapshot.records}
            analysis={snapshot.analysis}
            onPress={open("expenditure")}
          />
        );
      case "trend":
        return <TrendTile key={id} analysis={snapshot.analysis} profile={profile} onPress={open("weight")} />;
      case "balance":
        return (
          <BalanceTile
            key={id}
            records={snapshot.records}
            analysis={snapshot.analysis}
            onPress={open("balance")}
          />
        );
      case "goal":
        return (
          <GoalTile
            key={id}
            profile={profile}
            trendKg={snapshot.trendKg}
            analysis={snapshot.analysis}
            onPress={open("weight")}
          />
        );
      case "macros":
        return <MacrosTile key={id} week={week} profile={profile} onPress={open("macros")} />;
      case "sleep":
        return <SleepTile key={id} sleep={sleep} dates={lastDays(7)} onPress={open("sleep")} />;
      case "composition":
        return (
          <CompositionTile
            key={id}
            records={snapshot.records}
            profile={profile}
            onPress={open("composition")}
          />
        );
      case "consistency":
        return (
          <ConsistencyTile
            key={id}
            records={snapshot.records}
            sleep={sleep}
            dates={lastDays(35)}
            onPress={open("consistency")}
          />
        );
    }
  };
  // Agrupa las tarjetas pequeñas seguidas en una misma cuadrícula, respetando el orden.
  const blocks: PanelSection[][] = [];
  for (const item of layout.filter((section) => section.visible)) {
    const last = blocks.at(-1);
    if (TILES.includes(item.id) && last && TILES.includes(last[0])) last.push(item.id);
    else blocks.push([item.id]);
  }
  const heading = new Date()
    .toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <View style={AppTheme.sectionHeader}>
          <View>
            <Text style={AppTheme.eyebrow}>{heading}</Text>
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
        {streak && !VIEWER ? (
          <StreakCard summary={streak} onPress={() => router.push("/achievements")} />
        ) : null}
        {offerCheckIn && !VIEWER ? <DopiCheckIn level={streak?.stage.level ?? 1} onDone={load} /> : null}
        {VIEWER ? null : <TodaySection profile={profile} onChanged={load} />}
        <Text style={[AppTheme.sectionTitle, { marginTop: 8 }]}>Tu progreso</Text>
        {weekly ? <WeeklyCard summary={weekly} unit={weightUnitOf(profile)} /> : null}
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
