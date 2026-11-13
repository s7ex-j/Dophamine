import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Input, LinkButton, ProgressBar, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import {
  bestDays,
  createHabit,
  elapsed,
  moneySaved,
  nextMilestone,
  readHabits,
  restart,
  SOBRIETY_KEY,
  type SoberHabit,
} from "@/src/features/sobriety/sobriety";
import { localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

export default function SobrietyScreen() {
  return VIEWER ? <ViewerOnlyNotice what="La sobriedad" /> : <SobrietyContent />;
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Contadores de días sin un hábito. Una recaída empieza un conteo nuevo y
// conserva la mejor racha. Todo queda en el teléfono.
function SobrietyContent() {
  const [habits, setHabits] = useState<SoberHabit[]>([]);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [already, setAlready] = useState("");
  const [now, setNow] = useState(new Date());
  const load = useCallback(() => {
    getSetting(SOBRIETY_KEY).then((value) => setHabits(readHabits(value)));
  }, []);
  useFocusEffect(load);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const store = async (next: SoberHabit[]) => {
    setHabits(next);
    await setSetting(SOBRIETY_KEY, next);
  };
  const add = async () => {
    // Si ya llevas unos días, el conteo empieza en el pasado.
    const start = new Date(Date.now() - Math.max(0, Math.floor(Number(already) || 0)) * 86_400_000);
    const habit = createHabit(name, newId(), start, Number(cost) || undefined);
    if (!habit) return;
    await store([...habits, habit]);
    setName("");
    setCost("");
    setAlready("");
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        {habits.map((habit) => {
          const time = elapsed(habit, now);
          const milestone = nextMilestone(time.days);
          const saved = moneySaved(habit, now);
          return (
            <View key={habit.id} style={[AppTheme.card, { gap: 10 }]}>
              <Text style={AppTheme.eyebrow}>SIN {habit.name.toUpperCase()}</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={[AppTheme.title, { fontSize: 44 }]}>{time.days}</Text>
                <Text style={AppTheme.body}>
                  {time.days === 1 ? "día" : "días"} · {time.hours} h
                </Text>
              </View>
              {milestone.target !== null ? (
                <View style={{ gap: 4 }}>
                  <ProgressBar value={milestone.progress * 100} />
                  <Text style={AppTheme.hint}>
                    Próximo hito: {milestone.target} {milestone.target === 1 ? "día" : "días"}
                  </Text>
                </View>
              ) : (
                <Text style={AppTheme.hint}>Más de un año. Enorme.</Text>
              )}
              <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                <Text style={AppTheme.hint}>
                  <Ionicons name="trophy-outline" size={13} /> Mejor racha: {bestDays(habit, now)} días
                </Text>
                {saved ? <Text style={AppTheme.hint}>Ahorrado: {saved}</Text> : null}
                {habit.restarts.length ? (
                  <Text style={AppTheme.hint}>Nuevos comienzos: {habit.restarts.length}</Text>
                ) : null}
              </View>
              <View style={AppTheme.rowActions}>
                <Confirm
                  label="Empezar de nuevo"
                  question="¿Empezar de nuevo? Tu mejor racha se conserva."
                  confirm="Sí, desde hoy"
                  onConfirm={() =>
                    store(
                      habits.map((item) =>
                        item.id === habit.id ? restart(item, new Date(), localDateKey()) : item,
                      ),
                    )
                  }
                />
                <Confirm
                  label="Quitar"
                  question={`¿Dejar de contar "${habit.name}"?`}
                  confirm="Sí, quitar"
                  danger
                  onConfirm={() => store(habits.filter((item) => item.id !== habit.id))}
                />
              </View>
            </View>
          );
        })}

        <Card title={habits.length ? "Agregar otro" : "¿Qué quieres dejar?"}>
          <Input label="Hábito" value={name} onChangeText={setName} placeholder="Alcohol, tabaco, azúcar…" />
          <Input
            label="Cuánto gastabas por día (opcional)"
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Input
            label="Días que ya llevas (opcional)"
            value={already}
            onChangeText={setAlready}
            keyboardType="number-pad"
            placeholder="0"
          />
          <Button title="Empezar a contar" onPress={add} />
        </Card>
        <Text style={AppTheme.hint}>
          Esto es un contador para acompañarte, no un tratamiento. Si sientes que no puedes dejarlo por tu
          cuenta, buscar apoyo profesional ayuda mucho.
        </Text>
      </ScrollView>
    </Screen>
  );
}

/** Una acción que pide confirmar en la misma línea. */
function Confirm({
  label,
  question,
  confirm,
  danger,
  onConfirm,
}: {
  label: string;
  question: string;
  confirm: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  return asking ? (
    <View style={[AppTheme.rowActions, { flexBasis: "100%" }]}>
      <Text style={AppTheme.rowQuestion}>{question}</Text>
      <LinkButton
        title={confirm}
        danger={danger}
        onPress={() => {
          setAsking(false);
          onConfirm();
        }}
      />
      <LinkButton title="Cancelar" onPress={() => setAsking(false)} />
    </View>
  ) : (
    <LinkButton title={label} danger={danger} onPress={() => setAsking(true)} />
  );
}
