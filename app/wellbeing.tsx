import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { DetailChart } from "@/src/components/DetailChart";
import { Button, Card, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import type { SleepEntry } from "@/src/features/sleep/sleep";
import { getSleepSince } from "@/src/features/sleep/sleep.repository";
import { getWorkoutDates } from "@/src/features/training/training.repository";
import { QuickCheckIn } from "@/src/features/wellbeing/QuickCheckIn";
import { QUESTIONS, splitNote, wellbeingPatterns } from "@/src/features/wellbeing/wellbeing";
import {
  getRecentWellbeingEntries,
  type WellbeingEntry,
} from "@/src/features/wellbeing/wellbeing.repository";
import { addDays, localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// En la web (visor de solo lectura) esta pantalla no registra nada.
export default function WellbeingScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Bienestar" /> : <WellbeingScreenContent />;
}

const emoji = (key: "mood" | "energy" | "stress", value: number | null) =>
  value ? (QUESTIONS.find((question) => question.key === key)?.options[value - 1]?.emoji ?? "") : "—";

// Bienestar: el chequeo de un toque, tu evolución, los patrones que salen de
// tus datos (sueño, entreno, lo que influyó) y el historial.
function WellbeingScreenContent() {
  const [entries, setEntries] = useState<WellbeingEntry[]>([]);
  const [sleep, setSleep] = useState<SleepEntry[]>([]);
  const [workouts, setWorkouts] = useState<string[]>([]);
  const [again, setAgain] = useState(false);
  const load = useCallback(() => {
    const since = addDays(localDateKey(), -90);
    Promise.all([getRecentWellbeingEntries(90), getSleepSince(since), getWorkoutDates(since)]).then(
      ([nextEntries, nights, dates]) => {
        setEntries(nextEntries);
        setSleep(nights);
        setWorkouts(dates);
      },
    );
  }, []);
  useFocusEffect(load);

  const today = localDateKey();
  const checkedToday = entries.some((entry) => entry.date === today);
  // Un punto por día (el último chequeo del día), de lo más antiguo a lo más reciente.
  const byDay = [...new Map([...entries].reverse().map((entry) => [entry.date, entry])).values()].slice(-30);
  const patterns = wellbeingPatterns(entries, sleep, workouts);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        {!checkedToday || again ? (
          <Card title="Chequeo de hoy">
            <QuickCheckIn
              onDone={() => {
                setAgain(false);
                load();
              }}
            />
          </Card>
        ) : (
          <View style={[AppTheme.card, { gap: 8 }]}>
            <Text style={AppTheme.tileTitle}>Ya hiciste tu chequeo de hoy</Text>
            <Button title="Otro chequeo" variant="secondary" onPress={() => setAgain(true)} />
          </View>
        )}

        <Card title="Cómo vas">
          {byDay.length >= 2 ? (
            <DetailChart
              insight={{
                title: "Bienestar",
                unit: "/5",
                dates: byDay.map((entry) => entry.date),
                series: [
                  { label: "Ánimo", color: "accent", kind: "line", values: byDay.map((entry) => entry.mood) },
                  {
                    label: "Energía",
                    color: "blue",
                    kind: "line",
                    values: byDay.map((entry) => entry.energy),
                  },
                  {
                    label: "Estrés",
                    color: "warning",
                    kind: "line",
                    values: byDay.map((entry) => entry.stress),
                  },
                ],
              }}
            />
          ) : (
            <Text style={AppTheme.body}>Con dos chequeos verás tu ánimo, energía y estrés en el tiempo.</Text>
          )}
        </Card>

        <Card title="Tus patrones">
          {patterns.length ? (
            patterns.map((pattern) => (
              <Text key={pattern} style={AppTheme.body}>
                • {pattern}
              </Text>
            ))
          ) : (
            <Text style={AppTheme.body}>
              Con unas semanas de chequeos, sueño y entrenos verás aquí qué se relaciona con tus mejores días.
            </Text>
          )}
          <Text style={AppTheme.hint}>Son relaciones en tus datos, no causas: úsalas para observarte.</Text>
        </Card>

        <Card title="Historial">
          {entries.length ? (
            entries.slice(0, 20).map((entry) => {
              const { tags, text } = splitNote(entry.note);
              return (
                <View key={entry.id} style={[AppTheme.entryRow, { gap: 10 }]}>
                  <Text style={{ fontSize: 20 }}>
                    {emoji("mood", entry.mood)} {emoji("energy", entry.energy)}{" "}
                    {emoji("stress", entry.stress)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={AppTheme.entryName}>{entry.date}</Text>
                    {tags.length || text ? (
                      <Text style={AppTheme.entryDetail} numberOfLines={2}>
                        {[tags.join(", "), text].filter(Boolean).join(" · ")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={AppTheme.body}>
              Tus chequeos aparecerán aquí para ver tendencias, no para juzgar días aislados.
            </Text>
          )}
        </Card>
        <Text style={AppTheme.hint}>
          Una herramienta de autoconocimiento no sustituye apoyo profesional. Ante una urgencia, contacta los
          servicios de emergencia de tu zona.
        </Text>
      </ScrollView>
    </Screen>
  );
}
