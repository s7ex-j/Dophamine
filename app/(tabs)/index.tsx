import { useCallback, useEffect, useState } from "react";
import { ScreenSkeleton } from "@/src/components/Skeleton";
import { Pressable, View } from "react-native";
import { Text } from "@/src/components/Text";
import { TitledScroll } from "@/src/components/TitledScroll";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";

import { IconButton, Segmented, Screen } from "@/src/components/ui";
import { ViewerBanner, ViewerEmpty } from "@/src/features/backup/ViewerSections";
import { LayoutSwitch, ThemeSwitch } from "@/src/features/backup/ViewerChrome";
import { VIEWER_WIDE } from "@/src/lib/viewerLayout";
import { useViewerHasData } from "@/src/features/backup/viewerData";
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
  GoalTile,
  MacrosTile,
  NutritionWeek,
  SleepTile,
  TrendTile,
} from "@/src/features/dashboard/PanelSections";
import type { DayCompliance } from "@/src/features/habits/compliance";
import { getComplianceDays } from "@/src/features/habits/compliance.data";
import { Onboarding } from "@/src/features/profile/PlanWizard";
import { Welcome, WELCOME_KEY } from "@/src/features/welcome/Welcome";
import { weightUnitOf } from "@/src/features/profile/profile";
import { AutoAdjustBanner, CheckInCard } from "@/src/features/reviews/CheckInSections";
import { useCheckIn } from "@/src/features/reviews/useCheckIn";
import { TodaySection } from "@/src/features/dashboard/TodaySection";
import { StreakBadge } from "@/src/features/streak/StreakCard";
import { isClosingHour } from "@/src/features/calendar/calendar";
import { takePickedDay } from "@/src/features/calendar/pickedDay";
import { DayCloseSheet } from "@/src/features/wellbeing/DayCloseSheet";
import { DietCoachCard } from "@/src/features/diet/DietCoachCard";
import { getCoachToday, type CoachToday } from "@/src/features/diet/coach.data";
import {
  cycleStatus,
  PERIODS_KEY,
  PHASE_LABELS,
  PHASE_NOTES,
  readPeriods,
  type CycleStatus,
} from "@/src/features/period/period";
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
import { refreshWidget } from "@/src/features/widget/refresh";
import { syncHealthConnectDaily } from "@/src/features/health/healthConnect.repository";
import { autoBackupIfDue } from "@/src/features/backup/backup.repository";
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
  const [dietToday, setDietToday] = useState<CoachToday | null>(null);
  const [period, setPeriod] = useState<CycleStatus | null>(null);
  const [welcomed, setWelcomed] = useState<boolean | null>(null);
  const navigation = useNavigation();
  // El día que se mira; el calendario lo cambia al volver con una fecha.
  const [date, setDate] = useState(localDateKey());
  useFocusEffect(
    useCallback(() => {
      const picked = takePickedDay();
      if (picked) setDate(picked);
    }, []),
  );

  const load = useCallback(() => {
    getSetting(WELCOME_KEY).then((seen) => setWelcomed(Boolean(seen)));
    getCoachToday().then(setDietToday);
    Promise.all([
      getDashboardSnapshot(),
      getComplianceDays(1),
      getSleepSince(addDays(localDateKey(), -40)),
      getSetting(LAYOUT_KEY),
      getStreakSummary(),
      getWeeklySummary(),
      getWellbeingDates(localDateKey()),
      getSetting(DISMISS_KEY),
      getSetting(PERIODS_KEY),
    ]).then(
      ([nextSnapshot, days, nights, savedLayout, nextStreak, nextWeekly, checked, dismissed, periods]) => {
        setPeriod(cycleStatus(readPeriods(periods), localDateKey()));
        setOfferCheckIn(
          isClosingHour(new Date().getHours()) &&
            shouldOfferCheckIn(localDateKey(), checked.includes(localDateKey()), dismissed),
        );
        setStreak(nextStreak);
        setWeekly(nextWeekly);
        setSnapshot(nextSnapshot);
        setCompliance(days[0]?.compliance ?? null);
        setSleep(nights);
        setLayout(normalizeLayout(savedLayout));
      },
    );
  }, []);
  useEffect(load, [load]);
  // Una vez al día, lo nuevo de Health Connect (si ya se dio permiso) entra solo y el Panel se recarga.
  useEffect(() => {
    if (VIEWER) return;
    syncHealthConnectDaily()
      .then((result) => {
        if (result && (result.weights || result.nights || result.stepDays || result.foodDays)) load();
      })
      .catch(() => undefined);
  }, [load]);
  // Una vez por semana, una copia de los datos dentro del teléfono (Más → Respaldo la comparte).
  useEffect(() => {
    if (!VIEWER) autoBackupIfDue().catch(() => undefined);
  }, []);
  // Cada vez que el Panel se pone al día, el widget de la pantalla de inicio también.
  useEffect(() => {
    if (snapshot && !VIEWER) refreshWidget();
  }, [snapshot]);
  useFocusEffect(load);
  const [range, setRange] = useState<7 | 30>(7);
  const controls = useCheckIn(snapshot, load);

  const changeLayout = (next: PanelLayout) => {
    setLayout(next);
    void setSetting(LAYOUT_KEY, next);
  };

  // La bienvenida y la primera evaluación ocupan toda la pantalla: sin pestañas abajo.
  const firstRun = Boolean(snapshot && !VIEWER && (!snapshot.profile || welcomed === false));
  // En el visor las pestañas las decide su propio layout (solo con datos abiertos en esta visita).
  const viewerOpen = useViewerHasData(VIEWER);
  useEffect(() => {
    if (VIEWER) return;
    navigation.setOptions({
      tabBarStyle: firstRun
        ? { display: "none" }
        : { borderTopColor: AppTheme.colors.border, backgroundColor: AppTheme.colors.surface },
    });
  }, [firstRun, navigation]);

  if (!snapshot || welcomed === null) return <ScreenSkeleton />;
  // La primera vez: bienvenida con Term y luego la evaluación.
  // También la ve una vez quien ya usaba la app antes de que existiera.
  if (!VIEWER && !welcomed)
    return (
      <Welcome
        onDone={() => {
          setWelcomed(true);
          void setSetting(WELCOME_KEY, true);
        }}
      />
    );
  if (!snapshot.profile || (VIEWER && viewerOpen === false))
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
            days={range === 7 ? 14 : 30}
          />
        );
      case "trend":
        return (
          <TrendTile
            key={id}
            analysis={snapshot.analysis}
            profile={profile}
            onPress={open("weight")}
            days={range === 7 ? 14 : 30}
          />
        );
      case "balance":
        return (
          <BalanceTile
            key={id}
            records={snapshot.records}
            analysis={snapshot.analysis}
            onPress={open("balance")}
            days={range}
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
        return (
          <MacrosTile
            key={id}
            week={buildWeek(snapshot.records, new Date(), range)}
            profile={profile}
            onPress={open("macros")}
          />
        );
      case "sleep":
        return <SleepTile key={id} sleep={sleep} dates={lastDays(range)} onPress={open("sleep")} />;
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
    .replace(/^./, (letter) => letter.toUpperCase());

  return (
    <Screen>
      <TitledScroll
        title="Panel"
        context={heading}
        actions={
          VIEWER ? (
            VIEWER_WIDE ? null : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ThemeSwitch />
                <LayoutSwitch compact />
              </View>
            )
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {streak ? <StreakBadge summary={streak} onPress={() => router.push("/achievements")} /> : null}
              <IconButton
                icon="calendar-outline"
                label="Abrir el calendario"
                onPress={() => router.push({ pathname: "/calendar", params: { date } })}
              />
              <IconButton
                icon={customizing ? "checkmark" : "options-outline"}
                label="Personalizar el Panel"
                onPress={() => setCustomizing(!customizing)}
              />
            </View>
          )
        }
      >
        {VIEWER && !VIEWER_WIDE ? <ViewerBanner /> : null}
        <AutoAdjustBanner snapshot={snapshot} controls={controls} />
        {controls.action === "propose" ? <CheckInCard snapshot={snapshot} controls={controls} /> : null}
        {offerCheckIn && compliance && !VIEWER ? (
          <DayCloseSheet compliance={compliance} onDone={load} />
        ) : null}
        {VIEWER ? null : (
          <TodaySection
            profile={profile}
            date={date}
            onDate={setDate}
            refresh={compliance}
            onChanged={load}
            action={
              dietToday ? (
                <DietCoachCard
                  today={dietToday}
                  onChanged={load}
                  onOpenDiet={() => router.push("/diet")}
                  onOpenMeals={() => router.push({ pathname: "/meals", params: { date } })}
                />
              ) : undefined
            }
          />
        )}
        {period ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/period")}
            style={[AppTheme.card, { gap: 4, paddingVertical: 10 }]}
          >
            <Text style={AppTheme.tileTitle}>
              Ciclo: día {period.day} · {PHASE_LABELS[period.phase]}
            </Text>
            <Text style={AppTheme.tileSubtitle}>{PHASE_NOTES[period.phase]}</Text>
          </Pressable>
        ) : null}
        <View style={[AppTheme.sectionHeader, { marginTop: 4 }]}>
          <Text style={AppTheme.sectionTitle}>Tu progreso</Text>
          <View style={{ width: 150 }}>
            <Segmented
              label="Rango de los gráficos"
              value={range}
              onChange={setRange}
              options={[
                { value: 7, label: "7 días" },
                { value: 30, label: "30 días" },
              ]}
            />
          </View>
        </View>
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
        {weekly ? (
          <WeeklyCard
            summary={weekly}
            unit={weightUnitOf(profile)}
            onShare={VIEWER ? undefined : () => router.push("/week-share")}
          />
        ) : null}
      </TitledScroll>
    </Screen>
  );
}
