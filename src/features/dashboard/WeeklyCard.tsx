import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import type { IconName } from "@/src/components/ui";
import type { WeeklySummary } from "@/src/features/dashboard/weekly";
import { formatDuration } from "@/src/lib/time";
import { formatWeight, type WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

const shortDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("es-PE", { day: "numeric", month: "short" })
    .replace(".", "");
};

/** La semana pasada en seis datos. Solo aparece si hubo algún registro. */
export function WeeklyCard({ summary, unit }: { summary: WeeklySummary; unit: WeightUnit }) {
  if (!summary.loggedDays) return null;
  const change = summary.weightChangeKg;
  const items: Array<{ icon: IconName; label: string; value: string; color: string }> = [
    {
      icon: "scale-outline",
      label: "Peso medio",
      value:
        summary.avgWeightKg === null
          ? "—"
          : `${formatWeight(summary.avgWeightKg, unit, 1)}${
              change === null
                ? ""
                : ` (${change > 0 ? "+" : change < 0 ? "−" : "±"}${formatWeight(Math.abs(change), unit, 1)})`
            }`,
      color: AppTheme.colors.violet,
    },
    {
      icon: "flame-outline",
      label: "Calorías al día",
      value: summary.avgKcal === null ? "—" : `${summary.avgKcal} / ${summary.kcalTarget}`,
      color: AppTheme.colors.kcal,
    },
    {
      icon: "nutrition-outline",
      label: "Días con proteína",
      value: `${summary.proteinDays}/7`,
      color: AppTheme.colors.protein,
    },
    {
      icon: "barbell-outline",
      label: "Entrenos",
      value: String(summary.workouts),
      color: AppTheme.colors.accent,
    },
    {
      icon: "moon-outline",
      label: "Sueño medio",
      value: summary.avgSleepMinutes === null ? "—" : formatDuration(summary.avgSleepMinutes),
      color: AppTheme.colors.blue,
    },
    {
      icon: "calendar-outline",
      label: "Días registrados",
      value: `${summary.loggedDays}/7`,
      color: AppTheme.colors.amber,
    },
  ];
  return (
    <View style={[AppTheme.card, { gap: 12 }]}>
      <Text style={AppTheme.cardTitle}>
        Tu semana pasada · {shortDate(summary.weekStart)} – {shortDate(summary.weekEnd)}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
        {items.map((item) => (
          <View key={item.label} style={{ width: "50%", flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Ionicons name={item.icon} size={18} color={item.color} />
            <View style={{ flex: 1 }}>
              <Text style={AppTheme.tileSubtitle}>{item.label}</Text>
              <Text style={AppTheme.tileTitle}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
