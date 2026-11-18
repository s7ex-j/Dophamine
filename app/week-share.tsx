import { useCallback, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Share, View } from "react-native";
import { Text } from "@/src/components/Text";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

import { Button, Screen } from "@/src/components/ui";
import { weeklyStory, type WeeklySummary } from "@/src/features/dashboard/weekly";
import { getWeeklySummary } from "@/src/features/dashboard/weekly.data";
import { weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { Term } from "@/src/features/streak/Term";
import { getStreakSummary, type StreakSummary } from "@/src/features/streak/streak.data";
import { formatWeight } from "@/src/lib/units";
import { AppTheme, tint } from "@/src/theme";

type Part = "weight" | "food" | "training";
const PARTS: Array<{ key: Part; label: string }> = [
  { key: "weight", label: "Peso y ritmo" },
  { key: "food", label: "Calorías" },
  { key: "training", label: "Entreno y sueño" },
];

// Tu semana como imagen: se dibuja en el teléfono y tú eliges dónde enviarla.
export default function WeekShareScreen() {
  const card = useRef<ComponentRef<typeof View>>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [streak, setStreak] = useState<StreakSummary | null>(null);
  const [parts, setParts] = useState<Part[]>(["weight", "food", "training"]);
  const [message, setMessage] = useState("");
  useFocusEffect(
    useCallback(() => {
      Promise.all([getWeeklySummary(), getNutritionProfile(), getStreakSummary()]).then(
        ([week, plan, pet]) => {
          setSummary(week);
          setProfile(plan);
          setStreak(pet);
        },
      );
    }, []),
  );
  if (!summary || !profile)
    return (
      <Screen>
        <View style={AppTheme.content}>
          <Text style={AppTheme.body}>Tu primera semana completa aparecerá aquí el próximo lunes.</Text>
        </View>
      </Screen>
    );

  const unit = weightUnitOf(profile);
  const direction = profile.goal === "lose" ? -1 : profile.goal === "gain" ? 1 : 0;
  const filtered: WeeklySummary = {
    ...summary,
    ...(parts.includes("weight") ? {} : { weightChangeKg: null }),
    ...(parts.includes("food") ? {} : { avgKcal: null, proteinDays: 0 }),
    ...(parts.includes("training") ? {} : { workouts: 0, avgSleepMinutes: null }),
  };
  const story = weeklyStory(filtered, direction, unit);
  const share = async () => {
    setMessage("");
    try {
      // La captura pide su propio tipo de referencia; la vista es la misma.
      const uri = await captureRef(card as never, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png" });
      else throw new Error("sin compartir");
    } catch {
      // Sin captura (por ejemplo en la web), se comparte el texto.
      await Share.share({ message: `${story.title}\n${story.lines.join("\n")}\n— Dophamine` });
      setMessage("Se compartió como texto.");
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <View
          ref={card}
          collapsable={false}
          style={{
            backgroundColor: tint("#12241D"),
            borderRadius: 22,
            padding: 20,
            gap: 14,
            borderWidth: 1,
            borderColor: tint("#1F4A39"),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Term expression="orgullo" size={64} />
            <View style={{ flex: 1 }}>
              <Text style={[AppTheme.eyebrow, { color: tint("#86C8AA") }]}>
                Semana del {summary.weekStart.slice(5)} al {summary.weekEnd.slice(5)}
              </Text>
              <Text style={[AppTheme.title, { fontSize: 22 }]}>{story.title}</Text>
            </View>
          </View>
          {story.lines.map((line) => (
            <Text key={line} style={[AppTheme.body, { color: tint("#DDE7E1") }]}>
              {line}
            </Text>
          ))}
          <View
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderTopColor: tint("#1F4A39"),
              paddingTop: 12,
            }}
          >
            {[
              { label: "Racha", value: streak ? `${streak.current} días` : "—" },
              {
                label: "Peso medio",
                value:
                  parts.includes("weight") && summary.avgWeightKg
                    ? formatWeight(summary.avgWeightKg, unit, 1)
                    : "—",
              },
              { label: "Días registrados", value: `${summary.loggedDays}/7` },
            ].map((figure, index) => (
              <View
                key={figure.label}
                style={[
                  { flex: 1, gap: 2 },
                  index > 0 && { borderLeftWidth: 1, borderLeftColor: tint("#1F4A39"), paddingLeft: 10 },
                ]}
              >
                <Text style={[AppTheme.hint, { fontSize: 11, color: tint("#86C8AA") }]}>{figure.label}</Text>
                <Text style={[AppTheme.tileValue, { fontSize: 17 }]}>{figure.value}</Text>
              </View>
            ))}
          </View>
          <Text style={[AppTheme.hint, { color: tint("#86C8AA"), fontSize: 11 }]}>dophamine</Text>
        </View>

        <Text style={AppTheme.label}>Qué incluir</Text>
        <View style={AppTheme.groupList}>
          {PARTS.map((part, index) => {
            const active = parts.includes(part.key);
            return (
              <Pressable
                key={part.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() =>
                  setParts(active ? parts.filter((item) => item !== part.key) : [...parts, part.key])
                }
                style={[AppTheme.groupRow, index > 0 && AppTheme.groupRowDivider]}
              >
                <Text style={[AppTheme.optionTitle, { flex: 1 }]}>{part.label}</Text>
                <View style={[AppTheme.checkbox, active && AppTheme.checkboxActive]}>
                  {active ? <Text style={AppTheme.checkboxMark}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Button title="Compartir imagen" onPress={share} />
        <Text style={AppTheme.hint}>
          {message ||
            "La imagen se crea en tu teléfono; tú eliges dónde enviarla. Nada se sube a ningún lado."}
        </Text>
      </ScrollView>
    </Screen>
  );
}
