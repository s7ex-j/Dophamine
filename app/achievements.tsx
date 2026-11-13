import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, ProgressBar, Screen } from "@/src/components/ui";
import { Dopi } from "@/src/features/streak/Dopi";
import { shareText } from "@/src/features/streak/streak";
import { getStreakSummary, type StreakSummary } from "@/src/features/streak/streak.data";
import { AppTheme } from "@/src/theme";

const days = (value: number) => `${value} ${value === 1 ? "día" : "días"}`;

/** Compartir abre el menú del sistema: nada sale del teléfono si la persona no lo envía. */
async function share(message: string) {
  try {
    await Share.share({ message });
  } catch {
    /* Cancelado o sin menú para compartir. */
  }
}

// Racha de registro, Dopi y logros, con la opción de compartirlos.
export default function AchievementsScreen() {
  const [summary, setSummary] = useState<StreakSummary | null>(null);
  useFocusEffect(
    useCallback(() => {
      getStreakSummary().then(setSummary);
    }, []),
  );
  if (!summary) return <Screen />;
  const { stage } = summary;
  const unlocked = summary.achievements.filter((item) => item.unlocked);
  const locked = summary.achievements.filter((item) => !item.unlocked);
  const toNext = stage.next === null ? 1 : Math.min(1, summary.best / stage.next);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <View style={[AppTheme.card, { alignItems: "center", gap: 8 }]}>
          <Dopi level={stage.level} mood={summary.mood} size={160} />
          <Text style={AppTheme.title}>Dopi · {stage.name}</Text>
          <Text style={[AppTheme.body, { textAlign: "center" }]}>
            {summary.mood === "happy"
              ? "¡Ya anotaste hoy! Dopi está feliz."
              : summary.mood === "sad"
                ? "La racha se cortó. Anota algo hoy y Dopi vuelve a sonreír."
                : "Dopi espera tu registro de hoy."}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
            {[
              ["Racha actual", days(summary.current), "flame"],
              ["Mejor racha", days(summary.best), "trophy"],
            ].map(([label, value, icon]) => (
              <View key={label} style={[AppTheme.tile, { flex: 1, minWidth: 0 }]}>
                <Ionicons name={icon as "flame"} size={18} color={AppTheme.colors.amber} />
                <Text style={AppTheme.tileSubtitle}>{label}</Text>
                <Text style={AppTheme.tileValue}>{value}</Text>
              </View>
            ))}
          </View>
          {stage.next !== null ? (
            <View style={{ alignSelf: "stretch", gap: 4 }}>
              <ProgressBar value={toNext * 100} />
              <Text style={AppTheme.hint}>
                Crece al llegar a una racha de {days(stage.next)}. Nunca encoge: crece con tu mejor racha.
              </Text>
            </View>
          ) : (
            <Text style={AppTheme.hint}>Dopi llegó a su forma final.</Text>
          )}
          {summary.current > 0 ? (
            <Button
              title="Compartir mi racha"
              variant="secondary"
              onPress={() => share(shareText("streak", days(summary.current), stage))}
            />
          ) : null}
        </View>

        <Card title={`Logros · ${unlocked.length}/${summary.achievements.length}`}>
          {[...unlocked, ...locked].map((item) => (
            <View key={item.id} style={[AppTheme.entryRow, { gap: 12, opacity: item.unlocked ? 1 : 0.45 }]}>
              <Ionicons
                name={item.unlocked ? "medal" : "lock-closed-outline"}
                size={22}
                color={item.unlocked ? AppTheme.colors.amber : AppTheme.colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={AppTheme.entryName}>{item.title}</Text>
                <Text style={AppTheme.entryDetail}>{item.detail}</Text>
              </View>
              {item.unlocked ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Compartir ${item.title}`}
                  onPress={() => share(shareText("achievement", item.title, stage))}
                  hitSlop={8}
                >
                  <Ionicons name="share-outline" size={20} color={AppTheme.colors.accent} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </Card>

        <Text style={AppTheme.hint}>
          Compartir abre el menú de tu teléfono con un texto; nada se envía si tú no lo mandas.
        </Text>
      </ScrollView>
    </Screen>
  );
}
