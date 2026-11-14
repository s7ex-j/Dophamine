import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Input, RowActions, Screen } from "@/src/components/ui";
import {
  addPeriodStart,
  cycleLength,
  cycleStatus,
  endPeriod,
  PERIODS_KEY,
  PHASE_LABELS,
  PHASE_NOTES,
  periodLength,
  readPeriods,
  removePeriod,
  type Period,
} from "@/src/features/period/period";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const days = (value: number) => `${value} ${value === 1 ? "día" : "días"}`;

// Ciclo menstrual: anotar inicio y fin del periodo, la fase de hoy y el próximo
// estimado. Todo queda en el teléfono.
export default function PeriodScreen() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [other, setOther] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(() => {
    getSetting(PERIODS_KEY).then((value) => setPeriods(readPeriods(value)));
  }, []);
  useFocusEffect(load);
  const store = async (next: Period[]) => {
    setPeriods(next);
    await setSetting(PERIODS_KEY, next);
  };
  const today = localDateKey();
  const status = cycleStatus(periods, today);
  const open = periods.length ? !periods[periods.length - 1].end : false;
  const otherDate = /^\d{4}-\d{2}-\d{2}$/.test(other.trim()) && other.trim() <= today ? other.trim() : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        {status ? (
          <View style={[AppTheme.card, { gap: 8 }]}>
            <Text style={AppTheme.eyebrow}>
              DÍA {status.day} DE {status.length}
            </Text>
            <Text style={AppTheme.title}>{PHASE_LABELS[status.phase]}</Text>
            <Text style={AppTheme.body}>{PHASE_NOTES[status.phase]}</Text>
            <Text style={AppTheme.hint}>
              {status.late
                ? `El periodo se retrasa ${days(-status.daysUntilNext)} frente a tu ciclo típico.`
                : `Próximo periodo en unos ${days(status.daysUntilNext)} (${status.nextStart}).`}
            </Text>
          </View>
        ) : (
          <Card title="Ciclo menstrual">
            <Text style={AppTheme.body}>
              Anota cuándo empieza tu periodo. Con eso verás en qué fase estás y entenderás mejor los cambios
              de peso por retención de líquido.
            </Text>
          </Card>
        )}

        {VIEWER ? null : (
          <Card title="Anotar">
            <Button
              title={open ? "Terminó hoy" : "Empezó hoy"}
              onPress={() => store(open ? endPeriod(periods, today) : addPeriodStart(periods, today))}
            />
            <Input
              label="Otra fecha (AAAA-MM-DD)"
              value={other}
              onChangeText={(text) => {
                setOther(text);
                setMessage("");
              }}
              placeholder="2026-11-01"
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Empezó ese día"
                  variant="secondary"
                  onPress={() =>
                    otherDate
                      ? store(addPeriodStart(periods, otherDate))
                      : setMessage("Escribe una fecha pasada.")
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Terminó ese día"
                  variant="secondary"
                  onPress={() =>
                    otherDate ? store(endPeriod(periods, otherDate)) : setMessage("Escribe una fecha pasada.")
                  }
                />
              </View>
            </View>
            {message ? <Text style={AppTheme.errorText}>{message}</Text> : null}
          </Card>
        )}

        {periods.length ? (
          <Card
            title={`Ciclo típico: ${days(cycleLength(periods))} · periodo: ${days(periodLength(periods))}`}
          >
            {[...periods].reverse().map((period) => (
              <View key={period.start} style={{ gap: 2, paddingVertical: 4 }}>
                <Text style={AppTheme.entryName}>
                  {period.start}
                  {period.end ? ` → ${period.end}` : " (sin fin anotado)"}
                </Text>
                {VIEWER ? null : (
                  <RowActions
                    question="¿Borrar este periodo?"
                    onDelete={() => store(removePeriod(periods, period.start))}
                  />
                )}
              </View>
            ))}
          </Card>
        ) : null}
        <Text style={AppTheme.hint}>
          Es una estimación para entender tu peso y tu energía; no sirve como método anticonceptivo ni como
          diagnóstico. Todo queda solo en tu teléfono.
        </Text>
      </ScrollView>
    </Screen>
  );
}
