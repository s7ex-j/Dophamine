import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { Dopi } from "@/src/features/streak/Dopi";
import type { StreakSummary } from "@/src/features/streak/streak.data";
import { AppTheme } from "@/src/theme";

/** Racha en pequeño, para la cabecera del Panel: Dopi y los días. Tocarla abre los logros. */
export function StreakBadge({ summary, onPress }: { summary: StreakSummary; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Racha de ${summary.current} días. Ver logros`}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingLeft: 2,
        paddingRight: 10,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: AppTheme.colors.border,
      }}
    >
      <Dopi level={summary.stage.level} mood={summary.mood} size={30} />
      <Ionicons
        name="flame"
        size={14}
        color={summary.current ? AppTheme.colors.amber : AppTheme.colors.muted}
      />
      <Text style={[AppTheme.label, { color: AppTheme.colors.text }]}>{summary.current}</Text>
    </Pressable>
  );
}

/** Racha y Dopi en una fila del Panel. Tocarla abre los logros. */
export function StreakCard({ summary, onPress }: { summary: StreakSummary; onPress: () => void }) {
  const text =
    summary.mood === "happy"
      ? "Hoy ya cuenta"
      : summary.mood === "sad"
        ? "Anota algo para volver a empezar"
        : summary.current
          ? "Anota algo hoy para seguir"
          : "Anota algo para empezar tu racha";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Racha de ${summary.current} días. Ver logros`}
      onPress={onPress}
      style={[AppTheme.card, { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }]}
    >
      <Dopi level={summary.stage.level} mood={summary.mood} size={56} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons
            name="flame"
            size={20}
            color={summary.current ? AppTheme.colors.amber : AppTheme.colors.muted}
          />
          <Text style={AppTheme.tileValue}>
            {summary.current} {summary.current === 1 ? "día" : "días"}
          </Text>
        </View>
        <Text style={AppTheme.tileSubtitle}>
          {text} · Dopi {summary.stage.name.toLowerCase()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={AppTheme.colors.muted} />
    </Pressable>
  );
}
