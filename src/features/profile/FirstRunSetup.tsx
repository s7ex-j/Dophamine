import { useState } from "react";
import { ScrollView, View } from "react-native";

import { SpeechBubble } from "@/src/components/SpeechBubble";
import { Text } from "@/src/components/Text";
import { Button, Card, Screen } from "@/src/components/ui";
import { HealthConnectCard } from "@/src/features/health/HealthConnectCard";
import { starterConfig } from "@/src/features/reminders/reminders";
import { remindersAvailable, requestPermission, scheduleReminders } from "@/src/features/reminders/scheduler";
import { setSetting } from "@/src/features/settings/settings.repository";
import { Term } from "@/src/features/streak/Term";
import { haptic } from "@/src/lib/haptics";
import { AppTheme } from "@/src/theme";

const REMINDERS_KEY = "meal_reminders";
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * El último paso de la primera evaluación: el plan ya está guardado y se ofrecen, en un solo lugar,
 * los recordatorios y traer lo que ya hay en Health Connect. Todo se puede dejar para después.
 */
export function FirstRunSetup({ mealsPerDay, onDone }: { mealsPerDay?: number; onDone: () => void }) {
  const [reminders, setReminders] = useState<"idle" | "on" | "denied">("idle");
  const enableReminders = async () => {
    if (!(await requestPermission())) return setReminders("denied");
    const config = starterConfig(newId, mealsPerDay);
    await setSetting(REMINDERS_KEY, config);
    await scheduleReminders(config);
    haptic.success();
    setReminders("on");
  };
  return (
    <Screen>
      <ScrollView contentContainerStyle={[AppTheme.content, { flexGrow: 1 }]}>
        <Text style={AppTheme.title}>Tu plan está listo.</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Term expression="muy-feliz" size={72} />
          <View style={{ flex: 1 }}>
            <SpeechBubble tail="left" tailOffset={14}>
              <Text style={[AppTheme.body, { fontSize: 14, lineHeight: 20 }]}>
                Dos cosas más y empezamos. Puedes saltarlas y hacerlas después en Más.
              </Text>
            </SpeechBubble>
          </View>
        </View>
        {remindersAvailable ? (
          <Card title="Recordatorios">
            <Text style={AppTheme.body}>
              Te aviso a la hora de cada comida y para pesarte a las 7:00. Los avisos se programan en el
              teléfono; los horarios se cambian en Más → Recordatorios.
            </Text>
            {reminders === "on" ? (
              <Text style={[AppTheme.body, { color: AppTheme.colors.accentText }]}>
                Listo: recordatorios activados.
              </Text>
            ) : (
              <Button title="Activar recordatorios" onPress={enableReminders} />
            )}
            {reminders === "denied" ? (
              <Text style={AppTheme.hint}>
                Sin permiso para avisar. Puedes darlo después en los ajustes del teléfono.
              </Text>
            ) : null}
          </Card>
        ) : null}
        <HealthConnectCard onImported={() => undefined} />
        <View style={{ marginTop: "auto" }}>
          <Button title="Empezar" onPress={onDone} />
        </View>
      </ScrollView>
    </Screen>
  );
}
