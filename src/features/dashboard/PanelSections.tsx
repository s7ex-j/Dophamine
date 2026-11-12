import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { LineChart, MiniBar } from "@/src/components/charts";
import { ChoiceControl, IconButton, type IconName } from "@/src/components/ui";
import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { compositionSeries, latestComposition } from "@/src/features/composition/composition";
import { nutritionGrid, type GridKey, type WeekDay } from "@/src/features/dashboard/dashboard";
import { PANEL_SECTIONS, type PanelLayout, type PanelSection } from "@/src/features/dashboard/layout";
import {
  goalProgress,
  targetWeeklyRateKg,
  weightUnitOf,
  type NutritionProfile,
} from "@/src/features/profile/profile";
import type { MetabolicAnalysis } from "@/src/features/tdee/tdee";
import { energyBalance, expenditureSeries } from "@/src/features/tdee/tdee";
import { convertWeight, formatWeight, weightValue } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

// Secciones del Panel. Reciben los datos ya cargados; los cálculos están en el dominio.

const GRID_COLORS: Record<GridKey, string> = {
  kcal: AppTheme.colors.kcal,
  protein: AppTheme.colors.protein,
  fats: AppTheme.colors.fats,
  carbs: AppTheme.colors.carbs,
};

/** Barra de búsqueda que abre "Agregar alimento". */
export function FoodSearchBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buscar un alimento"
      onPress={onPress}
      style={[AppTheme.iconRow, AppTheme.searchBox]}
    >
      <Ionicons name="search" size={18} color={AppTheme.colors.muted} />
      <Text style={[AppTheme.hint, { flex: 1 }]}>Buscar un alimento</Text>
      <Ionicons name="barcode-outline" size={20} color={AppTheme.colors.muted} />
    </Pressable>
  );
}

/** La semana en una cuadrícula: calorías y macros por día contra su meta. */
export function NutritionWeek({ week, profile }: { week: WeekDay[]; profile: NutritionProfile }) {
  const [mode, setMode] = useState<"consumed" | "remaining">("consumed");
  const [selected, setSelected] = useState(week.length - 1);
  const rows = nutritionGrid(
    week,
    {
      calories: profile.calorieTarget,
      protein: profile.proteinTarget,
      fats: profile.fatsTarget,
      carbs: profile.carbsTarget,
    },
    mode,
  );
  return (
    <View style={AppTheme.card}>
      <Text style={AppTheme.sectionTitle}>Nutrición y metas</Text>
      <View style={AppTheme.iconRow}>
        <View style={{ flex: 1, gap: 10 }}>
          {rows.map((row) => (
            <View key={row.key} style={AppTheme.weekGrid}>
              {row.values.map((value, index) => (
                <Pressable
                  key={index}
                  accessibilityLabel={`${week[index].key} ${row.label}`}
                  onPress={() => setSelected(index)}
                  style={[AppTheme.weekGridColumn, { opacity: index === selected ? 1 : 0.55 }]}
                >
                  <MiniBar value={value} target={row.target} color={GRID_COLORS[row.key]} />
                </Pressable>
              ))}
            </View>
          ))}
          <View style={AppTheme.weekGrid}>
            {week.map((day, index) => (
              <Pressable key={day.key} onPress={() => setSelected(index)} style={AppTheme.weekGridColumn}>
                <Text style={[AppTheme.weekGridDay, index === selected && AppTheme.weekGridDayActive]}>
                  {day.day}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[AppTheme.weekGridValues, { paddingBottom: 22 }]}>
          {rows.map((row) => (
            <View key={row.key} style={{ height: 44, justifyContent: "center" }}>
              <Text style={[AppTheme.weekGridValue, { color: GRID_COLORS[row.key] }]}>
                {row.values[selected]}
                {row.key === "kcal" ? "" : ` ${row.label}`}
              </Text>
              <Text style={AppTheme.weekGridTarget}>de {row.target}</Text>
            </View>
          ))}
        </View>
      </View>
      <ChoiceControl
        value={mode}
        onChange={setMode}
        options={[
          { value: "consumed", label: "Consumido" },
          { value: "remaining", label: "Restante" },
        ]}
      />
    </View>
  );
}

function Tile({
  title,
  subtitle,
  value,
  unit,
  icon,
  onPress,
  wide,
  children,
}: {
  title: string;
  subtitle: string;
  value: string;
  unit?: string;
  icon: IconName;
  onPress?: () => void;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={wide ? AppTheme.tileWide : AppTheme.tile}>
      <View style={AppTheme.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={AppTheme.tileTitle}>{title}</Text>
          <Text style={AppTheme.tileSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name={icon} size={18} color={AppTheme.colors.muted} />
      </View>
      <View style={{ minHeight: 56, justifyContent: "center" }}>{children}</View>
      <View
        style={[
          AppTheme.sectionHeader,
          { borderTopWidth: 1, borderTopColor: AppTheme.colors.border, paddingTop: 8 },
        ]}
      >
        <Text style={AppTheme.tileValue}>
          {value}
          {unit ? <Text style={AppTheme.tileUnit}> {unit}</Text> : null}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.muted} />
      </View>
    </Pressable>
  );
}

const Waiting = ({ text }: { text: string }) => <Text style={AppTheme.tileSubtitle}>{text}</Text>;

export function ExpenditureTile({
  records,
  analysis,
  onPress,
}: {
  records: DailyBiometrics[];
  analysis: MetabolicAnalysis;
  onPress: () => void;
}) {
  const series = expenditureSeries(records, 14);
  return (
    <Tile
      title="Gasto"
      subtitle="Últimos 14 días"
      icon="flame-outline"
      value={analysis.tdee ? String(analysis.tdee) : "—"}
      unit={analysis.tdee ? "kcal" : undefined}
      onPress={onPress}
    >
      {series.length >= 2 ? (
        <LineChart
          values={series.map((point) => point.tdee)}
          color={AppTheme.colors.warning}
          area
          width={140}
        />
      ) : (
        <Waiting text={`Se activa con 14 días. Llevas ${analysis.loggedDays}.`} />
      )}
    </Tile>
  );
}

export function TrendTile({
  analysis,
  profile,
  onPress,
}: {
  analysis: MetabolicAnalysis;
  profile: NutritionProfile;
  onPress: () => void;
}) {
  const unit = weightUnitOf(profile);
  const points = analysis.points.slice(-14);
  const last = points.at(-1);
  return (
    <Tile
      title="Tendencia"
      subtitle="Peso suavizado"
      icon="trending-down-outline"
      value={last ? weightValue(last.trendKg, unit, 1) : "—"}
      unit={last ? unit : undefined}
      onPress={onPress}
    >
      {points.length >= 2 ? (
        <LineChart
          values={points.map((point) => convertWeight(point.trendKg, "kg", unit))}
          color={AppTheme.colors.violet}
          width={140}
        />
      ) : (
        <Waiting text="Pésate dos días para ver la tendencia." />
      )}
    </Tile>
  );
}

export function BalanceTile({
  records,
  analysis,
  onPress,
}: {
  records: DailyBiometrics[];
  analysis: MetabolicAnalysis;
  onPress: () => void;
}) {
  const balance = energyBalance(records, analysis.tdee, 7);
  const average = balance.length
    ? Math.round(balance.reduce((sum, day) => sum + day.balance, 0) / balance.length)
    : 0;
  return (
    <Tile
      title="Balance"
      subtitle="Últimos 7 días"
      icon="swap-vertical-outline"
      value={balance.length ? `${average > 0 ? "+" : ""}${average}` : "—"}
      unit={balance.length ? (average < 0 ? "déficit" : "superávit") : undefined}
      onPress={onPress}
    >
      {balance.length >= 2 ? (
        <LineChart
          values={balance.map((day) => day.intake)}
          reference={analysis.tdee ?? undefined}
          color={AppTheme.colors.blue}
          width={140}
        />
      ) : (
        <Waiting text="Necesita tu gasto estimado." />
      )}
    </Tile>
  );
}

export function GoalTile({
  profile,
  trendKg,
  analysis,
  onPress,
}: {
  profile: NutritionProfile;
  trendKg: number | null;
  analysis: MetabolicAnalysis;
  onPress: () => void;
}) {
  const unit = weightUnitOf(profile);
  const progress = goalProgress(profile, trendKg);
  const target = trendKg ? targetWeeklyRateKg(profile, trendKg) : null;
  return (
    <Tile
      title="Meta"
      subtitle={progress ? `${formatWeight(progress.goalKg, unit, 1)}` : "Mantenimiento"}
      icon="flag-outline"
      value={
        progress
          ? String(progress.percent)
          : analysis.weeklyRateKg === null
            ? "—"
            : weightValue(Math.abs(analysis.weeklyRateKg), unit, 2)
      }
      unit={progress ? "%" : analysis.weeklyRateKg === null ? undefined : `${unit}/sem`}
      onPress={onPress}
    >
      {progress ? (
        <>
          <View style={AppTheme.goalTrack}>
            <View style={[AppTheme.goalFill, { width: `${progress.percent}%` }]} />
          </View>
          <Text style={AppTheme.tileSubtitle}>
            {progress.reached
              ? "¡Meta alcanzada!"
              : `Faltan ${formatWeight(progress.remainingKg, unit, 1)}${progress.weeksLeft ? ` · ~${progress.weeksLeft} sem` : ""}`}
          </Text>
        </>
      ) : (
        <Waiting text={target === 0 ? "Objetivo: peso estable" : "Define una meta en Estrategia."} />
      )}
    </Tile>
  );
}

export function CompositionTile({
  records,
  profile,
  onPress,
}: {
  records: DailyBiometrics[];
  profile: NutritionProfile;
  onPress: () => void;
}) {
  const unit = weightUnitOf(profile);
  const latest = latestComposition(records);
  const series = compositionSeries(records).slice(-14);
  const current = series.at(-1);
  return (
    <Tile
      title="Composición corporal"
      subtitle={
        current ? `Masa magra ${formatWeight(current.leanMassKg, unit, 1)}` : "Grasa, músculo, agua y hueso"
      }
      icon="body-outline"
      value={latest.bodyFatPct ? String(latest.bodyFatPct) : "—"}
      unit={latest.bodyFatPct ? "% grasa" : undefined}
      onPress={onPress}
      wide
    >
      {series.length >= 2 ? (
        <LineChart
          values={series.map((point) => point.bodyFatPct)}
          color={AppTheme.colors.accent}
          width={300}
        />
      ) : (
        <Waiting text="Registra tu % de grasa en el Diario para ver su evolución." />
      )}
    </Tile>
  );
}

const SECTION_ICONS: Record<PanelSection, IconName> = {
  nutrition: "stats-chart-outline",
  expenditure: "flame-outline",
  trend: "trending-down-outline",
  balance: "swap-vertical-outline",
  goal: "flag-outline",
  composition: "body-outline",
  habits: "checkmark-done-outline",
};

/** Ordenar y ocultar secciones del Panel. */
export function CustomizePanel({
  layout,
  onMove,
  onToggle,
  onDone,
}: {
  layout: PanelLayout;
  onMove: (id: PanelSection, delta: number) => void;
  onToggle: (id: PanelSection) => void;
  onDone: () => void;
}) {
  return (
    <View style={AppTheme.card}>
      <View style={AppTheme.sectionHeader}>
        <Text style={AppTheme.sectionTitle}>Personalizar</Text>
        <IconButton icon="checkmark" label="Terminar de personalizar" onPress={onDone} />
      </View>
      {layout.map((item, index) => (
        <View key={item.id} style={AppTheme.entryRow}>
          <Ionicons name={SECTION_ICONS[item.id]} size={18} color={AppTheme.colors.muted} />
          <Text style={[AppTheme.entryName, { flex: 1, opacity: item.visible ? 1 : 0.5 }]}>
            {PANEL_SECTIONS.find((section) => section.id === item.id)?.label}
          </Text>
          <Pressable
            accessibilityLabel="Subir"
            disabled={index === 0}
            onPress={() => onMove(item.id, -1)}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={index === 0 ? AppTheme.colors.border : AppTheme.colors.body}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Bajar"
            disabled={index === layout.length - 1}
            onPress={() => onMove(item.id, 1)}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={index === layout.length - 1 ? AppTheme.colors.border : AppTheme.colors.body}
            />
          </Pressable>
          <Switch
            accessibilityLabel={`Mostrar ${item.id}`}
            value={item.visible}
            onValueChange={() => onToggle(item.id)}
            trackColor={{ true: AppTheme.colors.accent, false: AppTheme.colors.border }}
            thumbColor={AppTheme.colors.text}
          />
        </View>
      ))}
    </View>
  );
}
